import { supabase } from './supabase';
import { generateEmbedding } from './embeddings';
import { ClassifierResult, EntityInput } from '../types';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL    = 'llama-3.1-8b-instant';

function extractJSON(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const firstBrace = raw.indexOf('{');
  const lastBrace  = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) return raw.slice(firstBrace, lastBrace + 1);
  return raw.trim();
}

async function callClassifier(text: string): Promise<ClassifierResult> {
  const today = new Date().toISOString().split('T')[0];

  const prompt = `Classify this life log entry. Return only valid JSON. No explanation.

Schema: {"category":"expense|reading|idea|travel|shopping|health|misc","entities":[{"name":"string","type":"book|place|person|brand|project"}],"amount":number|null,"currency":"INR|USD|EUR|null","summary":"one sentence past tense","tags":["2 to 4 lowercase tags"],"embedding_doc":"string"}

embedding_doc format: "[category] amount currency | entity name | ${today}\\nSummary: summary text\\nTags: tag1, tag2, tag3"
If no amount, omit it. If no entity, write "general". Keep embedding_doc under 120 characters.

Examples:

Input: "spent 80 on coffee at Blue Tokai"
Output: {"category":"expense","entities":[{"name":"Blue Tokai","type":"place"}],"amount":80,"currency":"INR","summary":"Spent ₹80 on coffee at Blue Tokai.","tags":["coffee","food","cafe","morning"],"embedding_doc":"[expense] 80 INR | Blue Tokai | ${today}\\nSummary: Coffee at Blue Tokai\\nTags: coffee, food, cafe"}

Input: "finished reading chapter 5 of Atomic Habits, great stuff about habit stacking"
Output: {"category":"reading","entities":[{"name":"Atomic Habits","type":"book"}],"amount":null,"currency":null,"summary":"Finished chapter 5 of Atomic Habits about habit stacking.","tags":["books","habits","productivity","reading"],"embedding_doc":"[reading] | Atomic Habits | ${today}\\nSummary: Chapter 5 habit stacking\\nTags: books, habits, productivity"}

Input: "had lunch with Priya at Rustom's, spent 650"
Output: {"category":"expense","entities":[{"name":"Priya","type":"person"},{"name":"Rustom's","type":"place"}],"amount":650,"currency":"INR","summary":"Had lunch with Priya at Rustom's for ₹650.","tags":["food","lunch","friends","eating out"],"embedding_doc":"[expense] 650 INR | Rustom's | ${today}\\nSummary: Lunch with Priya\\nTags: food, lunch, friends"}

Input: "${text.replace(/"/g, "'")}"
Output:`;

  const response = await fetch(GROQ_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.EXPO_PUBLIC_GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 400,
    }),
  });

  const data = await response.json();
  const raw  = data.choices[0].message.content.trim();
  const json = extractJSON(raw);
  return JSON.parse(json) as ClassifierResult;
}

async function upsertEntity(
  entity: EntityInput,
  userId: string
): Promise<string | null> {
  const { data: existing } = await supabase
    .from('entities')
    .select('id')
    .eq('user_id', userId)
    .ilike('name', entity.name)
    .eq('type', entity.type)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('entities')
    .insert({ user_id: userId, name: entity.name, type: entity.type })
    .select('id')
    .single();

  if (error) {
    console.error('[classifier] entity upsert failed:', error);
    return null;
  }
  return created.id;
}

export async function classifyAndSave(
  rawText: string,
  userId: string
): Promise<void> {
  let result: ClassifierResult;

  try {
    result = await callClassifier(rawText);
  } catch (err) {
    console.error('[classifier] primary parse failed, using fallback:', err);
    result = {
      category: 'misc',
      entities: [],
      amount: null,
      currency: null,
      summary: rawText,
      tags: [],
      embedding_doc: `[misc] | general | ${new Date().toISOString().split('T')[0]}\nSummary: ${rawText}`,
    };
  }

  const embedding = await generateEmbedding(result.embedding_doc);

  const { data: entry, error: entryError } = await supabase
    .from('entries')
    .insert({
      user_id:       userId,
      raw_text:      rawText,
      category:      result.category,
      summary:       result.summary,
      amount:        result.amount,
      currency:      result.currency,
      tags:          result.tags,
      embedding_doc: result.embedding_doc,
      embedding,
    })
    .select('id')
    .single();

  if (entryError || !entry) {
    console.error('[classifier] entry insert failed:', entryError);
    return;
  }

  if (result.entities.length > 0) {
    const entityIds = await Promise.all(
      result.entities.map(e => upsertEntity(e, userId))
    );

    const links = entityIds
      .filter((id): id is string => id !== null)
      .map(entityId => ({ entry_id: entry.id, entity_id: entityId }));

    if (links.length > 0) {
      const { error: linkError } = await supabase
        .from('entry_entities')
        .insert(links);

      if (linkError) {
        console.error('[classifier] entry_entities insert failed:', linkError);
      }
    }
  }
}

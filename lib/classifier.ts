import { ClassifierResult, EntityInput, ClassifierItem } from '../types';
import { generateEmbedding } from './embeddings';
import { supabase } from './supabase';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

function extractJSON(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) return raw.slice(firstBrace, lastBrace + 1);
  return raw.trim();
}

async function callClassifier(text: string): Promise<ClassifierResult> {
  const today = new Date().toISOString().split('T')[0];

  const systemPrompt = `Classify this life log entry for a personal journal app. 
If the user mentions multiple distinct facts or a list of items, split them into logical groups.

Groups should be based on:
1. Different Categories (e.g., one 'reading' item and one 'expense' item).
2. Different expense types (e.g., group all groceries together, all electronics together).

Return ONLY valid JSON. No explanation. No markdown.

Categories: expense, reading, travel, idea, shopping, health, media, misc.

Schema:
{"items": [{
  "category":"string",
  "entities":[{"name":"string","type":"book|place|person|brand|project|product|movie|tv_show|song|game|app|event|course"}],
  "amount":number|null,
  "currency":"INR|USD|EUR|null",
  "summary":"one sentence past tense listing items",
  "tags":["2 to 4 lowercase tags"],
  "embedding_doc":"string"
}]}

Rules for items:
- If user lists many groceries and a few electronics, create TWO 'expense' items. 
- Item 1 summary: "Bought groceries: milk (50), bread (40), eggs (60)." (Total amount: 150)
- Item 2 summary: "Bought electronics: charger (500), cable (200)." (Total amount: 700)
- Always include the specific item names and their individual costs (if provided) in the 'summary' and 'embedding_doc'.
- embedding_doc format: "[category] amount currency | item names | ${today}\\nSummary: list items and costs\\nTags: tag1, tag2"`;

  const userPrompt = `Input: "Spent 50 on milk, 40 on bread, 1000 on a keyboard and 300 on a mouse"
Output: {
  "items": [
    {
      "category": "expense",
      "entities": [{"name": "milk", "type": "product"}, {"name": "bread", "type": "product"}],
      "amount": 90,
      "currency": "INR",
      "summary": "Bought groceries: milk (50) and bread (40).",
      "tags": ["groceries", "food", "daily"],
      "embedding_doc": "[expense] 90 INR | milk, bread | ${today}\\nSummary: Bought milk (50) and bread (40)\\nTags: groceries, food"
    },
    {
      "category": "expense",
      "entities": [{"name": "keyboard", "type": "product"}, {"name": "mouse", "type": "product"}],
      "amount": 1300,
      "currency": "INR",
      "summary": "Bought electronics: keyboard (1000) and mouse (300).",
      "tags": ["electronics", "tech", "accessories"],
      "embedding_doc": "[expense] 1300 INR | keyboard, mouse | ${today}\\nSummary: Bought keyboard (1000) and mouse (300)\\nTags: electronics, tech"
    }
  ]
}

Input: "${text.replace(/"/g, "'")}"
Output:`;

  try {
    const response = await fetch(GROQ_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.EXPO_PUBLIC_GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 600,
        response_format: { type: 'json_object' }
      }),
    });

    const data = await response.json();
    if (!data.choices || data.choices.length === 0) {
      console.error('[classifier] Groq returned no choices:', data);
      throw new Error('Groq returned no choices');
    }
    const raw = data.choices[0].message.content.trim();
    console.log('[classifier] raw AI response:', raw);

    let json: string;
    try {
      json = extractJSON(raw);
    } catch (e) {
      console.error('[classifier] JSON extraction failed. Raw:', raw);
      throw e;
    }
    return JSON.parse(json) as ClassifierResult;
  } catch (err) {
    console.error('[classifier] API or Parse error:', err);
    throw err;
  }
}
async function upsertEntity(
  entity: EntityInput,
  userId: string
): Promise<string | null> {
  const type = entity.type.toLowerCase();

  try {
    const { data: existing } = await supabase
      .from('entities')
      .select('id')
      .eq('user_id', userId)
      .ilike('name', entity.name)
      .eq('type', type)
      .maybeSingle();

    if (existing) return existing.id;

    const { data: created, error } = await supabase
      .from('entities')
      .insert({ user_id: userId, name: entity.name, type: type })
      .select('id')
      .single();

    if (error) {
      console.error('[classifier] entity upsert failed:', error);
      return null;
    }
    return created.id;
  } catch (err) {
    console.error('[classifier] unexpected entity error:', err);
    return null;
  }
}

async function getCategoryId(name: string, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .ilike('name', name)
    .single();

  if (data) return data.id;

  const { data: defaultCat } = await supabase
    .from('categories')
    .select('id')
    .ilike('name', name)
    .eq('is_default', true)
    .limit(1)
    .single();

  return defaultCat?.id || null;
}

async function saveSingleItem(item: ClassifierItem, rawText: string, userId: string) {
  const categoryId = await getCategoryId(item.category, userId);

  let embedding: number[] | undefined;
  try {
    embedding = await generateEmbedding(item.embedding_doc);
  } catch (err) {
    console.error('[classifier] embedding failed for item:', err);
  }

  const { data: entry, error: entryError } = await supabase
    .from('entries')
    .insert({
      user_id: userId,
      raw_text: rawText,
      category_id: categoryId,
      summary: item.summary,
      amount: item.amount,
      currency: item.currency,
      tags: item.tags,
      embedding_doc: item.embedding_doc,
      embedding,
    })
    .select('id')
    .single();

  if (entryError || !entry) {
    console.error('[classifier] entry insert failed:', entryError);
    return;
  }

  console.log(`[classifier] Entry saved: ${entry.id}`);

  if (item.entities.length > 0) {
    const entityIds = await Promise.all(
      item.entities.map(e => upsertEntity(e, userId))
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

export async function classifyAndSave(
  rawText: string,
  userId: string
): Promise<void> {
  console.log(`[classifier] Processing: "${rawText}"`);
  let result: ClassifierResult;

  try {
    result = await callClassifier(rawText);
  } catch (err) {
    console.error('[classifier] classification failed, using fallback:', err);
    result = {
      items: [{
        category: 'misc',
        entities: [],
        amount: null,
        currency: null,
        summary: rawText,
        tags: ['misc'],
        embedding_doc: `[misc] | general | ${new Date().toISOString().split('T')[0]}\nSummary: ${rawText}`,
      }]
    };
  }

  console.log(`[classifier] Split into ${result.items.length} items`);

  await Promise.all(result.items.map(item => saveSingleItem(item, rawText, userId)));
}

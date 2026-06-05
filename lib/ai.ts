import { ParsedQuery, RetrievalAnswer } from '../types';
import { hybridSearch } from './hybridSearch';
import { Entry } from '../types';

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

function computeAggregations(entries: Entry[], parsed: ParsedQuery) {
  if (parsed.aggregation === 'sum') {
    const total = entries.reduce((acc, e) => acc + (e.amount ?? 0), 0);
    const currency = entries.find(e => e.currency)?.currency ?? 'INR';
    return { total, currency, count: entries.length };
  }
  if (parsed.aggregation === 'count') {
    return { count: entries.length };
  }
  return null;
}

function summariseEntries(entries: Entry[]): string {
  return entries.slice(0, 8).map(e =>
    `- ${e.summary ?? e.raw_text} | ${e.category ? (typeof e.category === 'string' ? e.category : e.category.name) : ''} | ${e.amount ? `${e.currency ?? ''} ${e.amount}` : ''} | ${new Date(e.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
  ).join('\n');
}

export async function generateRetrievalAnswer(
  parsed: ParsedQuery,
  userId: string
): Promise<RetrievalAnswer> {
  const entries = await hybridSearch(parsed, userId);

  if (entries.length === 0) {
    return {
      answer: "I couldn't find anything matching that. Try rephrasing or check if you've logged it.",
      entry_ids: [],
      type: 'narrative',
    };
  }

  const precomputed = computeAggregations(entries, parsed);
  const timeContext = parsed.time_filter.range ?? 'recently';
  const entrySummary = summariseEntries(entries);

  let aggregationInstruction = '';
  if (parsed.aggregation === 'sum' && precomputed && 'total' in precomputed) {
    aggregationInstruction = `The total amount is ${precomputed.total} ${precomputed.currency} across ${precomputed.count} entries. Lead with this total.`;
  } else if (parsed.aggregation === 'count' && precomputed) {
    aggregationInstruction = `There are exactly ${precomputed.count} entries. Lead with this number.`;
  } else if (parsed.aggregation === 'list') {
    aggregationInstruction = 'List the entries conversationally. Be concise.';
  } else {
    aggregationInstruction = 'Give a natural conversational answer based on the entries.';
  }

  const prompt = `You answer questions about someone's personal life logs. Be a smart, brief friend — not a chatbot.

Question: "${parsed.rewritten_query}"
Time context: ${timeContext}
${aggregationInstruction}

Entries found:
${entrySummary}

Rules:
- Keep answer under 3 sentences
- Mention specific names, amounts, or dates from the entries
- If time context is given, mention it
- Do not say "Based on your entries" or "I found" — just answer
- Return only valid JSON, no markdown

Schema: {"answer":"string","entry_ids":["uuid array"],"type":"sum|count|list|narrative"}

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
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 300,
      }),
    });

    const data = await response.json();
    const raw  = data.choices[0].message.content.trim();
    const json = extractJSON(raw);
    const result = JSON.parse(json) as RetrievalAnswer;

    const validIds = new Set(entries.map(e => e.id));
    result.entry_ids = result.entry_ids.filter(id => validIds.has(id));

    return result;
  } catch (err) {
    console.error('[ai] retrieval answer failed:', err);
    const fallbackAnswer = precomputed && 'total' in precomputed
      ? `You spent ${precomputed.currency} ${precomputed.total} across ${precomputed.count} entries ${timeContext}.`
      : `Found ${entries.length} entries ${timeContext}.`;

    return {
      answer: fallbackAnswer,
      entry_ids: entries.map(e => e.id),
      type: parsed.aggregation ?? 'narrative',
    };
  }
}

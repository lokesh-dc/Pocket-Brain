// lib/ai.ts
// Uses Groq (llama-3.1-8b-instant) for retrieval — answers user queries from matched entries

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RetrievalEntry {
  id: string;
  raw_text: string;
  summary: string;
  category: string;
  amount: number | null;
  currency: string | null;
  timestamp: string;
}

export interface RetrievalResult {
  answer: string;
  entry_ids: string[];
  type: 'summary' | 'list' | 'calculation' | 'empty';
}

// ─── Retrieval ────────────────────────────────────────────────────────────────

const RETRIEVAL_SYSTEM_PROMPT = `You are a personal memory assistant inside an app called Mindrop. The user logs thoughts, expenses, books, ideas, and more. Your job is to answer their retrieval questions using only the entries provided.

Always respond with a valid JSON object and nothing else — no markdown, no explanation, no backticks.

JSON shape:
{
  "answer": string — a conversational, friendly response (like a smart friend, not a robot),
  "entry_ids": string[] — IDs of entries you referenced in your answer,
  "type": one of "summary" | "list" | "calculation" | "empty"
}

Rules:
- "calculation" → when summing money, counts, or totals (e.g. "how much did I spend")
- "list" → when listing specific entries (e.g. "what books did I read")
- "summary" → when giving a broad overview (e.g. "what have I been up to this week")
- "empty" → when no entries match the query at all
- Be concise. Max 3 sentences for summary/calculation. Use a short bullet list for "list" type.
- Reference amounts with their currency symbol when available.
- If entries span multiple days, mention the date range naturally.
- Never make up entries. Only use what's given.`;

export async function getRetrievalAnswer(
  query: string,
  matchedEntries: RetrievalEntry[]
): Promise<RetrievalResult> {
  if (matchedEntries.length === 0) {
    return {
      answer: "I couldn't find anything matching that. Try logging some entries first!",
      entry_ids: [],
      type: 'empty',
    };
  }

  // Format entries for the prompt — keep it concise
  const entriesContext = matchedEntries
    .map(e => {
      const date = new Date(e.timestamp).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short',
      });
      const amountStr = e.amount != null ? ` | ${e.currency ?? ''}${e.amount}` : '';
      return `[${e.id}] (${date}) [${e.category}${amountStr}] ${e.summary || e.raw_text}`;
    })
    .join('\n');

  const userMessage = `User query: "${query}"\n\nMatched entries:\n${entriesContext}`;
  const response = await fetch(GROQ_BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.3,
      max_tokens: 512,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: RETRIEVAL_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq retrieval error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content ?? '{}';

  try {
    const parsed = JSON.parse(raw) as RetrievalResult;
    return {
      answer: parsed.answer ?? 'Something went wrong parsing the response.',
      entry_ids: Array.isArray(parsed.entry_ids) ? parsed.entry_ids : [],
      type: parsed.type ?? 'summary',
    };
  } catch {
    return {
      answer: 'Had trouble reading the response. Please try again.',
      entry_ids: [],
      type: 'empty',
    };
  }
}
// lib/ai.ts
// Uses Groq (llama-3.1-8b-instant) for retrieval — answers user queries from matched entries

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY!;
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

const RETRIEVAL_SYSTEM_PROMPT = `You are a personal memory assistant inside an app called Mindrop. The user logs thoughts, expenses, books, ideas, and more.

Always respond with a valid JSON object and nothing else — no markdown, no explanation, no backticks.

JSON shape:
{
  "answer": string — a conversational, friendly response (like a smart friend, not a robot),
  "entry_ids": string[] — IDs of entries you actually used in your calculation or answer,
  "type": one of "summary" | "list" | "calculation" | "empty"
}

== CRITICAL FILTERING RULE ==
The entries you receive are candidates from a vector search — they are NOT all guaranteed to be relevant.
You MUST filter them yourself before calculating or listing.

For example:
- Query "how much did I spend on bike" → only include entries where the description is clearly about a bike (repair, petrol for bike, puncture, etc.). Do NOT include dahi, dinner, stationary, or other unrelated expenses.
- Query "what books did I read" → only include reading entries, not ideas or travel.
- Query "how much on food" → only include food-related expenses like dinner, lunch, groceries. Not petrol, not stationary.

When in doubt about whether an entry is relevant to the query topic, EXCLUDE it.
Only sum or list entries that are clearly topically relevant to what the user asked.

== OTHER RULES ==
- "calculation" → summing money or counts. Show the total AND a brief breakdown of what you included.
- "list" → listing specific entries. Use a short bullet format.
- "summary" → broad overview of a time period or category.
- "empty" → nothing relevant found after filtering.
- Be concise. Max 3 sentences + breakdown for calculations.
- Always mention what you included and what you excluded if relevant (e.g. "I counted bike repair and puncture but not your dinner or dahi expenses").
- Reference amounts with their currency symbol.
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

  // Format entries for the prompt — include raw_text so LLM has full context for filtering
  const entriesContext = matchedEntries
    .map(e => {
      const date = new Date(e.timestamp).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short',
      });
      const amountStr = e.amount != null ? ` | amount: ${e.currency ?? '₹'}${e.amount}` : '';
      // Include raw_text alongside summary — gives LLM more signal for filtering
      const text = e.summary && e.summary !== e.raw_text
        ? `${e.summary} (original: "${e.raw_text}")`
        : e.raw_text;
      return `[id:${e.id}] (${date}) [${e.category}${amountStr}] ${text}`;
    })
    .join('\n');

  const userMessage = `User query: "${query}"\n\nCandidate entries (filter these yourself before answering):\n${entriesContext}`;

  const response = await fetch(GROQ_BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.1, // low temp — this is a precision task, not creative
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
    console.log({ parsed })
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
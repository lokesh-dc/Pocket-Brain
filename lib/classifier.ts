// lib/classifier.ts
// Uses Groq (llama-3.1-8b-instant) for classification — fast, free tier 14k req/day

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Intent = 'log' | 'retrieve';

export interface ClassificationResult {
  category: 'expense' | 'reading' | 'idea' | 'travel' | 'shopping' | 'health' | 'misc';
  entity: string | null;
  entity_type: 'book' | 'place' | 'project' | 'person' | 'brand' | null;
  amount: number | null;
  currency: string | null;
  summary: string;
}

// ─── Intent Detection (rule-based, no API call) ───────────────────────────────

const RETRIEVE_KEYWORDS = [
  'what', 'how much', 'show me', 'give me', 'when did',
  'how many', 'find', 'list', 'summarize', 'tell me', 'which', 'where did',
];

export function detectIntent(input: string): Intent {
  const lower = input.toLowerCase().trim();
  return RETRIEVE_KEYWORDS.some(kw => lower.includes(kw)) ? 'retrieve' : 'log';
}

// ─── Classifier ───────────────────────────────────────────────────────────────

const CLASSIFIER_SYSTEM_PROMPT = `You are a smart life-logger classifier. Your job is to analyze short user inputs and extract structured data from them.

Always respond with a valid JSON object and nothing else — no markdown, no explanation, no backticks.

JSON shape:
{
  "category": one of "expense" | "reading" | "idea" | "travel" | "shopping" | "health" | "misc",
  "entity": string or null — a named thing (book title, place, person, brand, project),
  "entity_type": one of "book" | "place" | "project" | "person" | "brand" or null,
  "amount": number or null — only for expenses,
  "currency": string or null — ISO code like "USD", "INR", "EUR" — only for expenses,
  "summary": string — a clean, concise 1-sentence version of the input (max 12 words)
}

Rules:
- If the input mentions paying, spent, bought, cost → category is "expense"
- If it mentions a book, article, read, reading → category is "reading"
- If it's a thought, shower thought, idea, realization → category is "idea"
- If it mentions a trip, flight, hotel, visited, travel → category is "travel"
- If it mentions buying something (not expense amount) → category is "shopping"
- If it mentions workout, gym, calories, sleep, medicine, health → category is "health"
- Default to "misc" if unsure
- Always store the amount in Indian Rupees
- Extract entity only if clearly named (e.g. "Atomic Habits", "Bangalore", "Nike")
- Keep summary short and clean, third-person neutral ("Paid ₹450 for lunch", "Read chapter 3 of Atomic Habits")`;

export async function classifyEntry(input: string): Promise<ClassificationResult> {
  const response = await fetch(GROQ_BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.1, // low temp for consistent structured output
      max_tokens: 256,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: CLASSIFIER_SYSTEM_PROMPT },
        { role: 'user', content: input },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq classifier error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content ?? '{}';

  try {
    const parsed = JSON.parse(raw) as ClassificationResult;
    // Sanitize — ensure required fields have fallbacks
    return {
      category: parsed.category ?? 'misc',
      entity: parsed.entity ?? null,
      entity_type: parsed.entity_type ?? null,
      amount: typeof parsed.amount === 'number' ? parsed.amount : null,
      currency: parsed.currency ?? null,
      summary: parsed.summary ?? input.slice(0, 80),
    };
  } catch {
    // If JSON parse fails, return safe fallback
    return {
      category: 'misc',
      entity: null,
      entity_type: null,
      amount: null,
      currency: null,
      summary: input.slice(0, 80),
    };
  }
}
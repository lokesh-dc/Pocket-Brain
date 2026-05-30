// lib/classifier.ts
// Uses Groq (llama-3.1-8b-instant) for classification — fast, free tier 14k req/day

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY!;
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

const CLASSIFIER_SYSTEM_PROMPT = `You are a smart life-logger classifier. Analyze the user's input and extract structured data.

Always respond with a valid JSON object and nothing else — no markdown, no explanation, no backticks.

== CRITICAL: MULTI-ITEM DETECTION ==
If the input contains MULTIPLE distinct items (especially multiple expenses like "spent 30 on dahi, 50 on puncture and 90 on dinner"), you MUST split them into separate entries.

Return either:
- A single object (for one item)
- An array of objects (for multiple items)

Each object has this shape:
{
  "category": one of "expense" | "reading" | "idea" | "travel" | "shopping" | "health" | "misc",
  "entity": string or null,
  "entity_type": one of "book" | "place" | "project" | "person" | "brand" or null,
  "amount": number or null — the amount for THIS specific item only,
  "currency": string or null — ISO code like "USD", "INR", "EUR",
  "summary": string — a clean 1-sentence description of THIS specific item only (e.g. "Spent ₹50 on bike puncture repair")
}

== SPLITTING RULES ==
- "spent 30 on dahi, 50 on bike puncture and 90 on dinner" → 3 separate entries, amounts 30, 50, 90
- "bought milk and eggs" → 2 entries (no amounts, that's fine)
- "read Atomic Habits and loved it" → 1 entry (it's one thought about one book)
- "spent 500 on groceries" → 1 entry
- Comma/and-separated lists of different things with individual amounts = always split

== CATEGORY RULES ==
- paying/spent/bought with amount → "expense"
- book/article/read/reading → "reading"
- thought/idea/realization → "idea"
- trip/flight/hotel/visited → "travel"
- buying something (no amount) → "shopping"
- workout/gym/calories/sleep/medicine → "health"
- default → "misc"

== SUMMARY RULES ==
- Short, clean, third-person neutral
- Include the specific item and amount: "Spent ₹50 on bike puncture", "Paid ₹90 for dinner"
- Max 12 words

== AMOUNT & CURRENCY RULES ==
- Always store amount as a plain number (e.g. 50, not "₹50")
- Default currency is "INR" unless the user explicitly mentions a different currency (USD, EUR, etc.)
- Always set currency to "INR" if no currency is mentioned
- In the summary string, always format amounts with the ₹ symbol (e.g. "Spent ₹50 on dahi")`;

export async function classifyEntry(input: string): Promise<ClassificationResult[]> {
  const response = await fetch(GROQ_BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.1,
      max_tokens: 512,
      // No response_format constraint — Llama returns root arrays which json_object mode blocks
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
  const raw = (data.choices?.[0]?.message?.content ?? '[]')
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  try {
    const parsed = JSON.parse(raw);

    // Normalize: root array (Llama does this), { items: [] }, { entries: [] }, or single flat object
    let results: ClassificationResult[] = [];

    if (Array.isArray(parsed)) {
      results = parsed;
    } else if (Array.isArray(parsed.items)) {
      results = parsed.items;
    } else if (Array.isArray(parsed.entries)) {
      results = parsed.entries;
    } else {
      // Single item returned as flat object
      results = [parsed];
    }

    // Sanitize each result
    return results.map(r => ({
      category: r.category ?? 'misc',
      entity: r.entity ?? null,
      entity_type: r.entity_type ?? null,
      amount: typeof r.amount === 'number' ? r.amount : null,
      currency: r.currency ?? null,
      summary: r.summary ?? input.slice(0, 80),
    }));

  } catch {
    // Fallback: return single unsplit entry
    return [{
      category: 'misc',
      entity: null,
      entity_type: null,
      amount: null,
      currency: null,
      summary: input.slice(0, 80),
    }];
  }
}
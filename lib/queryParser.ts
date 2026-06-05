import { ParsedQuery, TimeFilter } from '../types';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

function resolveTimeFilter(raw: TimeFilter): TimeFilter {
  if (!raw.range) return raw;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const iso = (d: Date) => d.toISOString();

  const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayEnd   = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  switch (raw.range) {
    case 'today':
      return { ...raw, from: iso(dayStart(today)), to: iso(dayEnd(today)) };

    case 'yesterday': {
      const yd = new Date(today); yd.setDate(yd.getDate() - 1);
      return { ...raw, from: iso(dayStart(yd)), to: iso(dayEnd(yd)) };
    }

    case 'this_week': {
      const mon = new Date(today);
      mon.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      return { ...raw, from: iso(dayStart(mon)), to: iso(dayEnd(today)) };
    }

    case 'last_week': {
      const mon = new Date(today);
      mon.setDate(today.getDate() - ((today.getDay() + 6) % 7) - 7);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { ...raw, from: iso(dayStart(mon)), to: iso(dayEnd(sun)) };
    }

    case 'this_month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { ...raw, from: iso(start), to: iso(dayEnd(today)) };
    }

    case 'last_month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end   = new Date(today.getFullYear(), today.getMonth(), 0);
      return { ...raw, from: iso(dayStart(start)), to: iso(dayEnd(end)) };
    }

    default:
      return raw;
  }
}

function extractJSON(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const firstBrace = raw.indexOf('{');
  const lastBrace  = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    return raw.slice(firstBrace, lastBrace + 1);
  }
  return raw.trim();
}

export async function parseQuery(input: string): Promise<ParsedQuery> {
  const prompt = `You parse user queries for a personal life-logging app. Return only valid JSON. No explanation. No markdown.

Schema:
{"intent":"retrieve|log","rewritten_query":"string","category_filter":"expense|reading|idea|travel|shopping|health|misc|null","time_filter":{"type":"relative|absolute|null","range":"today|yesterday|this_week|last_week|this_month|last_month|null","from":"ISO date or null","to":"ISO date or null"},"entity_filter":"string or null","aggregation":"sum|count|list|null"}

Rules:
- intent is "retrieve" if the user is asking a question or requesting information
- intent is "log" if the user is recording something that happened
- rewritten_query: rephrase into a clean semantic search query, 1-2 sentences max
- category_filter: only set if the query clearly targets one category
- time_filter range: set "range" field to the relative keyword, set from/to to null (they get resolved later)
- entity_filter: set only if query mentions a specific named thing (book title, person name, place name)
- aggregation: "sum" for total amounts, "count" for how many, "list" for show me

Examples:
Input: "what did I spend this week"
Output: {"intent":"retrieve","rewritten_query":"expenses and money spent","category_filter":"expense","time_filter":{"type":"relative","range":"this_week","from":null,"to":null},"entity_filter":null,"aggregation":"sum"}

Input: "show me my Atomic Habits notes"
Output: {"intent":"retrieve","rewritten_query":"notes and highlights from Atomic Habits","category_filter":"reading","time_filter":{"type":null,"range":null,"from":null,"to":null},"entity_filter":"Atomic Habits","aggregation":"list"}

Input: "how many ideas did I log in April"
Output: {"intent":"retrieve","rewritten_query":"ideas and thoughts logged","category_filter":"idea","time_filter":{"type":"relative","range":"last_month","from":null,"to":null},"entity_filter":null,"aggregation":"count"}

Input: "had coffee this morning"
Output: {"intent":"log","rewritten_query":"had coffee this morning","category_filter":null,"time_filter":{"type":null,"range":null,"from":null,"to":null},"entity_filter":null,"aggregation":null}

Input: "food last week"
Output: {"intent":"retrieve","rewritten_query":"food and eating expenses last week","category_filter":"expense","time_filter":{"type":"relative","range":"last_week","from":null,"to":null},"entity_filter":null,"aggregation":"list"}

Now parse this input:
Input: "${input.replace(/"/g, "'")}"
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
        temperature: 0,
        max_tokens: 300,
      }),
    });

    const data = await response.json();
    const raw  = data.choices[0].message.content.trim();
    const json = extractJSON(raw);
    const parsed: ParsedQuery = JSON.parse(json);

    parsed.time_filter = resolveTimeFilter(parsed.time_filter);

    return parsed;
  } catch (err) {
    console.error('[queryParser] failed, falling back to retrieve-all:', err);
    return {
      intent: 'retrieve',
      rewritten_query: input,
      category_filter: null,
      time_filter: { type: null, range: null, from: null, to: null },
      entity_filter: null,
      aggregation: null,
    };
  }
}

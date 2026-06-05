import { supabase } from './supabase';
import { generateEmbedding } from './embeddings';
import { ParsedQuery, Entry } from '../types';

const RRF_K = 60;

function reciprocalRankFusion(
  vectorResults: Entry[],
  structuredResults: Entry[]
): Entry[] {
  const scores = new Map<string, number>();
  const entryMap = new Map<string, Entry>();

  const addResults = (results: Entry[]) => {
    results.forEach((entry, rank) => {
      const prev = scores.get(entry.id) ?? 0;
      scores.set(entry.id, prev + 1 / (RRF_K + rank + 1));
      entryMap.set(entry.id, entry);
    });
  };

  addResults(vectorResults);
  addResults(structuredResults);

  return Array.from(entryMap.values())
    .sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0))
    .slice(0, 10);
}

export async function hybridSearch(
  parsed: ParsedQuery,
  userId: string
): Promise<Entry[]> {
  const queryEmbedding = await generateEmbedding(parsed.rewritten_query);

  if (!queryEmbedding) {
    console.error('[hybridSearch] embedding generation failed');
    return [];
  }

  const filters: {
    p_category?: string;
    p_from?: string;
    p_to?: string;
    p_entity_name?: string;
  } = {};

  if (parsed.category_filter) filters.p_category    = parsed.category_filter;
  if (parsed.time_filter.from) filters.p_from        = parsed.time_filter.from;
  if (parsed.time_filter.to)   filters.p_to          = parsed.time_filter.to;
  if (parsed.entity_filter)    filters.p_entity_name = parsed.entity_filter;

  const [vectorRes, structuredRes] = await Promise.all([
    supabase.rpc('match_documents_filtered', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: 20,
      p_user_id: userId,
      ...filters,
    }),

    (() => {
      let query = supabase
        .from('entries')
        .select(`
          id, raw_text, summary, category, amount, currency,
          timestamp, tags,
          entry_entities (
            entity:entities ( id, name, type )
          )
        `)
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(20);

      if (parsed.category_filter) query = query.eq('category', parsed.category_filter);
      if (parsed.time_filter.from) query = query.gte('timestamp', parsed.time_filter.from);
      if (parsed.time_filter.to)   query = query.lte('timestamp', parsed.time_filter.to);

      return query;
    })(),
  ]);

  const vectorEntries    = (vectorRes.data    ?? []) as Entry[];
  const structuredEntries = (structuredRes.data ?? []) as Entry[];

  const filteredStructured = parsed.entity_filter
    ? structuredEntries.filter(e =>
        (e as any).entry_entities?.some((ee: any) =>
          ee.entity?.name?.toLowerCase().includes(parsed.entity_filter!.toLowerCase())
        )
      )
    : structuredEntries;

  return reciprocalRankFusion(vectorEntries, filteredStructured);
}

import { supabase } from './supabase';
import { generateEmbedding } from './embeddings';

export async function backfillEntries(userId: string): Promise<{ total: number; updated: number }> {
  const { data: entries, error } = await supabase
    .from('entries')
    .select('*, category:categories(name)')
    .eq('user_id', userId)
    .is('embedding_doc', null);

  if (error) {
    console.error('[backfill] fetch failed:', error);
    return { total: 0, updated: 0 };
  }

  if (!entries || entries.length === 0) {
    return { total: 0, updated: 0 };
  }

  let updated = 0;

  for (const entry of entries) {
    const categoryName = (entry as any).category?.name || 'misc';
    const date = new Date(entry.timestamp).toISOString().split('T')[0];
    const amountStr = entry.amount
      ? `${entry.amount} ${entry.currency || 'INR'}`
      : '';
    const tags = [categoryName.toLowerCase()];

    const embeddingDoc = amountStr
      ? `[${categoryName}] ${amountStr} | general | ${date}\nSummary: ${entry.summary || entry.raw_text}\nTags: ${tags.join(', ')}`
      : `[${categoryName}] | general | ${date}\nSummary: ${entry.summary || entry.raw_text}\nTags: ${tags.join(', ')}`;

    const embedding = await generateEmbedding(embeddingDoc);

    const { error: updateError } = await supabase
      .from('entries')
      .update({
        category: categoryName,
        tags,
        embedding_doc: embeddingDoc,
        embedding,
      })
      .eq('id', entry.id);

    if (updateError) {
      console.error('[backfill] update failed for', entry.id, updateError);
    } else {
      updated++;
    }
  }

  return { total: entries.length, updated };
}

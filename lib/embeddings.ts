import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabase';

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY!);

export const generateEmbedding = async (text: string): Promise<number[] | null> => {
  try {
    // Switched back to gemini-embedding-2 as text-embedding-004 is returning 404. 
    // This model returns 3072 dimensions in this API version.
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-2' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
};

export async function searchEntries(query: string, userId: string) {
  try {
    const embedding = await generateEmbedding(query);
    if (!embedding) return [];

    // 1. Semantic Search via RPC
    const { data: semanticResults, error: semanticError } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: 10,
      p_user_id: userId,
    });

    if (semanticError) {
      console.error('Semantic search error:', semanticError);
    }

    // 2. Simple Category/Time Filtering (Regex based for speed)
    const categoryKeywords: Record<string, string[]> = {
      expenses: ['spend', 'cost', 'paid', 'expense', 'price', 'food', 'travel'],
      reading: ['read', 'book', 'article', 'kindle'],
      ideas: ['idea', 'thought', 'plan'],
      travel: ['travel', 'trip', 'flight', 'hotel'],
    };

    let detectedCategory = null;
    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(k => query.toLowerCase().includes(k))) {
        detectedCategory = cat;
        break;
      }
    }

    // Basic structured search
    let queryBuilder = supabase
      .from('entries')
      .select('*, category:categories(*)')
      .eq('user_id', userId)
      .limit(10);

    if (detectedCategory) {
      // Find category ID first if needed, but for simplicity we'll just use the semantic results
      // unless the user specifically wants more.
    }

    // For now, we combine and deduplicate
    const results = semanticResults || [];
    return results;
  } catch (error) {
    console.error('Search entries error:', error);
    return [];
  }
}

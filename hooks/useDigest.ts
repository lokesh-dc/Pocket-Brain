import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startOfDay, startOfWeek, startOfMonth, endOfDay } from 'date-fns';
import { supabase } from '../lib/supabase';
import { Digest, DigestPeriod, DigestRawData, Entry } from '../types';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';
const CACHE_KEY_PREFIX = 'digest_cache_';

export function useDigest(period: DigestPeriod) {
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getRange = (p: DigestPeriod) => {
    const now = new Date();
    let start: Date;
    const end = endOfDay(now);

    if (p === 'today') {
      start = startOfDay(now);
    } else if (p === 'week') {
      start = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    } else {
      start = startOfMonth(now);
    }

    return { start: start.toISOString(), end: end.toISOString() };
  };

  const aggregateData = async (userId: string, start: string, end: string): Promise<DigestRawData> => {
    const { data: entries, error: entriesError } = await supabase
      .from('entries')
      .select('*, category:categories(*), entities:entities(*)')
      .eq('user_id', userId)
      .gte('timestamp', start)
      .lte('timestamp', end);

    if (entriesError) throw entriesError;
    if (!entries || entries.length === 0) {
      return { entryCountByCategory: {}, totalAmountByCategory: {} };
    }

    const typedEntries = entries as Entry[];
    const entryCountByCategory: Record<string, number> = {};
    const totalAmountByCategory: Record<string, number> = {};
    let biggestExpense: DigestRawData['biggestExpense'] = undefined;

    typedEntries.forEach(entry => {
      const catName = entry.category?.name || 'misc';
      entryCountByCategory[catName] = (entryCountByCategory[catName] || 0) + 1;

      if (catName.toLowerCase() === 'expense' && entry.amount) {
        totalAmountByCategory[catName] = (totalAmountByCategory[catName] || 0) + entry.amount;
        if (!biggestExpense || entry.amount > biggestExpense.amount) {
          biggestExpense = {
            amount: entry.amount,
            currency: entry.currency || 'INR',
            summary: entry.summary || entry.raw_text,
            timestamp: entry.timestamp,
          };
        }
      }
    });

    // Top Entity logic
    const entityCounts: Record<string, number> = {};
    typedEntries.forEach(entry => {
      entry.entities?.forEach(entity => {
        entityCounts[entity.name] = (entityCounts[entity.name] || 0) + 1;
      });
    });

    let topEntity: DigestRawData['topEntity'] = undefined;
    Object.entries(entityCounts).forEach(([name, count]) => {
      if (!topEntity || count > topEntity.count) {
        topEntity = { name, count };
      }
    });

    return {
      entryCountByCategory,
      totalAmountByCategory,
      biggestExpense,
      topEntity,
    };
  };

  const generateNarrative = async (rawData: DigestRawData, p: DigestPeriod): Promise<string> => {
    const stats = {
      period: p,
      categories: rawData.entryCountByCategory,
      totals: rawData.totalAmountByCategory,
      top_expense: rawData.biggestExpense,
      top_entity: rawData.topEntity,
    };

    const prompt = `You are a friendly personal AI summarising the user's life logs for ${p}. Be warm, specific, and concise. Tone: smart friend recapping your day/week/month — not robotic.

Aggregated data:
${JSON.stringify(stats, null, 2)}

Rules:
- 2–3 sentences paragraph
- No bullet points
- No markdown
- Be specific about what they did (reading, spending, ideas, etc.)
- Use the provided amounts and entity names naturally.`;

    const response = await fetch(GROQ_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.EXPO_PUBLIC_GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'system', content: 'You are a warm, helpful personal log summarizer.' }, { role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) throw new Error('Failed to generate narrative from Groq');
    const data = await response.json();
    return data.choices[0].message.content.trim();
  };

  const fetchDigest = useCallback(async (forceRegenerate = false) => {
    try {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Check AsyncStorage first for instant render
      const cachedString = await AsyncStorage.getItem(`${CACHE_KEY_PREFIX}${period}`);
      if (cachedString && !forceRegenerate) {
        const cachedDigest = JSON.parse(cachedString) as Digest;
        setDigest(cachedDigest);
        // If it's less than 24h old, we might be fine. But prompt says:
        // "Regenerate if: no cached digest exists OR generated_at is older than 24 hours"
        const ageInHours = (new Date().getTime() - new Date(cachedDigest.generated_at).getTime()) / (1000 * 60 * 60);
        if (ageInHours < 24) {
          setLoading(false);
          return;
        }
      }

      // 2. Check Supabase
      const { data: dbDigest, error: dbError } = await supabase
        .from('digests')
        .select('*')
        .eq('user_id', user.id)
        .eq('period', period)
        .single();

      if (dbDigest && !forceRegenerate) {
        const ageInHours = (new Date().getTime() - new Date(dbDigest.generated_at).getTime()) / (1000 * 60 * 60);
        if (ageInHours < 24) {
          setDigest(dbDigest);
          await AsyncStorage.setItem(`${CACHE_KEY_PREFIX}${period}`, JSON.stringify(dbDigest));
          setLoading(false);
          return;
        }
      }

      // 3. Regenerate
      const range = getRange(period);
      const rawData = await aggregateData(user.id, range.start, range.end);
      
      // If no entries, we show empty state (handled in UI via digest.raw_data)
      const hasEntries = Object.keys(rawData.entryCountByCategory).length > 0;
      let narrative = "Nothing logged yet — drop a thought to get started";
      
      if (hasEntries) {
        narrative = await generateNarrative(rawData, period);
      }

      const newDigest: Partial<Digest> = {
        user_id: user.id,
        period,
        narrative,
        raw_data: rawData,
        generated_at: new Date().toISOString(),
      };

      const { data: upsertedDigest, error: upsertError } = await supabase
        .from('digests')
        .upsert(newDigest, { onConflict: 'user_id,period' })
        .select()
        .single();

      if (upsertError) throw upsertError;

      setDigest(upsertedDigest);
      await AsyncStorage.setItem(`${CACHE_KEY_PREFIX}${period}`, JSON.stringify(upsertedDigest));

    } catch (err: any) {
      console.error('[useDigest] error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchDigest();
  }, [fetchDigest]);

  return { digest, loading, error, refresh: () => fetchDigest(true) };
}

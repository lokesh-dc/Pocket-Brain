import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { backfillEntries } from '../lib/backfillEntries';
import { Entry } from '../types';

export function useEntries() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [backfillRunning, setBackfillRunning] = useState(false);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('entries')
        .select(`
          *,
          category:categories(*),
          entities:entities(*)
        `)
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching entries:', error);
      } else {
        setEntries(data || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const runBackfill = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || backfillRunning) return;

    setBackfillRunning(true);
    const result = await backfillEntries(user.id);
    setBackfillRunning(false);

    if (result.updated > 0) {
      console.log(`[backfill] migrated ${result.updated}/${result.total} entries`);
      await fetchEntries();
    }
  }, [backfillRunning, fetchEntries]);

  const addEntry = (entry: Entry) => {
    setEntries(prev => [entry, ...prev]);
  };

  const updateEntry = (id: string, updates: Partial<Entry>) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const removeEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return { 
    entries, 
    loading,
    backfillRunning,
    refresh: fetchEntries,
    addEntry,
    updateEntry,
    removeEntry,
    runBackfill
  };
}

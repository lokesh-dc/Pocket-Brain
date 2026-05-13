import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Entry } from '../types';

export function useEntries() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = async () => {
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
  };

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
  }, []);

  return { 
    entries, 
    loading, 
    refresh: fetchEntries,
    addEntry,
    updateEntry,
    removeEntry
  };
}

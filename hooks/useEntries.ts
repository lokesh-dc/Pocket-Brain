import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Entry } from '../types';

export function useEntries() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('entries')
      .select('*, category:categories(*)')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching entries:', error);
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  return { entries, loading, refresh: fetchEntries };
}

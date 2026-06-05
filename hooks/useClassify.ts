import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { parseQuery } from '../lib/queryParser';
import { classifyAndSave } from '../lib/classifier';
import { generateRetrievalAnswer } from '../lib/ai';
import { RetrievalAnswer } from '../types';

export function useClassify() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RetrievalAnswer | null>(null);

  const processInput = async (input: string): Promise<void> => {
    setIsLoading(true);
    setResult(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[useClassify] no authenticated user');
        setIsLoading(false);
        return;
      }

      const parsed = await parseQuery(input);

      if (parsed.intent === 'log') {
        await classifyAndSave(input, user.id);
        setIsLoading(false);
        return;
      }

      const answer = await generateRetrievalAnswer(parsed, user.id);
      setResult(answer);
    } catch (err) {
      console.error('[useClassify] error processing input:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResult = () => setResult(null);

  return {
    isLoading,
    result,
    processInput,
    clearResult,
  };
}

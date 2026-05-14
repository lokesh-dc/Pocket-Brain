-- Semantic search function with similarity
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(3072), -- Aligned with gemini-embedding-2
  match_threshold float,
  match_count int,
  p_user_id uuid
)
RETURNS TABLE(
  id uuid,
  raw_text text,
  category text,
  summary text,
  amount numeric,
  currency text,
  entry_timestamp timestamptz,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    e.id, 
    e.raw_text, 
    c.name as category, 
    e.summary, 
    e.amount, 
    e.currency, 
    e.timestamp as entry_timestamp,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM entries e
  LEFT JOIN categories c ON e.category_id = c.id
  WHERE e.user_id = p_user_id
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;

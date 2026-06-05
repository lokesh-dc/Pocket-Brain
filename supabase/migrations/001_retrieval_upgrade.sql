-- 001_retrieval_upgrade.sql
-- Adds category text column, tags, embedding_doc, performance indexes,
-- and the new match_documents_filtered RPC for hybrid search.

-- 1a. Add columns to entries table
ALTER TABLE entries ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE entries ADD COLUMN IF NOT EXISTS embedding_doc text;

-- 1b. Add performance indexes
CREATE INDEX IF NOT EXISTS entries_user_timestamp
  ON entries(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS entries_user_category
  ON entries(user_id, category);

CREATE INDEX IF NOT EXISTS entries_category_timestamp
  ON entries(user_id, category, timestamp DESC);

-- 1c. Create new RPC match_documents_filtered (does not alter or drop existing match_documents)
CREATE OR REPLACE FUNCTION match_documents_filtered(
  query_embedding   vector,
  match_threshold   float,
  match_count       int,
  p_user_id         uuid,
  p_category        text        DEFAULT NULL,
  p_from            timestamptz DEFAULT NULL,
  p_to              timestamptz DEFAULT NULL,
  p_entity_name     text        DEFAULT NULL
)
RETURNS TABLE (
  id          uuid,
  raw_text    text,
  summary     text,
  category    text,
  amount      numeric,
  currency    text,
  "timestamp" timestamptz,
  tags        text[],
  similarity  float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.raw_text,
    e.summary,
    e.category,
    e.amount,
    e.currency,
    e.timestamp,
    e.tags,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM entries e
  WHERE e.user_id = p_user_id
    AND (p_category   IS NULL OR e.category  = p_category)
    AND (p_from       IS NULL OR e.timestamp >= p_from)
    AND (p_to         IS NULL OR e.timestamp <= p_to)
    AND (
      p_entity_name IS NULL
      OR EXISTS (
        SELECT 1
        FROM entry_entities ee
        JOIN entities en ON en.id = ee.entity_id
        WHERE ee.entry_id = e.id
          AND en.name ILIKE '%' || p_entity_name || '%'
      )
    )
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

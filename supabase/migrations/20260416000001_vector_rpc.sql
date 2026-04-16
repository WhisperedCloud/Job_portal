-- RPC function for vector similarity search
CREATE OR REPLACE FUNCTION match_candidates(
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  name text,
  skills text[],
  seniority text,
  domain_focus text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.skills,
    c.seniority,
    c.domain_focus,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM candidates c
  WHERE 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

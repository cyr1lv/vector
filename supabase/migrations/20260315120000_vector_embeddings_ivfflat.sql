-- ANN index for cosine distance (operator <=> + vector_cosine_ops)
-- Superseded by 20260315210000_vector_ivfflat_midscale_tune.sql (lists=200) on upgrade paths.
CREATE INDEX IF NOT EXISTS vector_embeddings_embedding_idx
ON public.vector_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

ANALYZE public.vector_embeddings;

-- Same interface and return shape; probes tuned for recall vs speed
CREATE OR REPLACE FUNCTION match_vector_embeddings(
  query_embedding vector(1536),
  match_tenant_id text,
  match_limit int default 5
)
RETURNS TABLE (
  tenant_id text,
  actor_type text,
  actor_ref_id text,
  source_type text,
  source_ids text[],
  embedding_model text,
  created_at timestamptz,
  distance float
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO public
AS $function$
BEGIN
  PERFORM set_config('ivfflat.probes', '10', true);
  RETURN QUERY
  SELECT
    v.tenant_id::text,
    v.actor_type,
    v.actor_ref_id::text,
    v.source_type,
    v.source_ids::text[],
    v.embedding_model,
    v.created_at,
    (v.embedding <=> query_embedding)::float AS distance
  FROM public.vector_embeddings v
  WHERE v.tenant_id = match_tenant_id
  ORDER BY v.embedding <=> query_embedding
  LIMIT match_limit;
END;
$function$;

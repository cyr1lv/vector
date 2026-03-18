-- Mid-scale tuning (30k–100k embeddings): coarser IVFFLAT lists, higher probes via SET LOCAL.
-- Future when rows > ~100k: consider lists = 400; consider probes = 30 (not implemented here).

DROP INDEX IF EXISTS public.vector_embeddings_embedding_idx;

CREATE INDEX vector_embeddings_embedding_idx
ON public.vector_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 200);

ANALYZE public.vector_embeddings;

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
  -- Per-transaction only (not session-wide); higher probes when fewer results requested
  IF match_limit <= 5 THEN
    SET LOCAL ivfflat.probes = 30;
  ELSIF match_limit <= 20 THEN
    SET LOCAL ivfflat.probes = 20;
  ELSE
    SET LOCAL ivfflat.probes = 10;
  END IF;

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

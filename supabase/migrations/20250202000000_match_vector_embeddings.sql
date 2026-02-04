create or replace function match_vector_embeddings(
  query_embedding vector(1536),
  match_tenant_id text,
  match_limit int default 5
)
returns table (
  tenant_id text,
  actor_type text,
  actor_ref_id text,
  source_type text,
  source_ids text[],
  embedding_model text,
  created_at timestamptz,
  distance float
)
language sql stable
as $$
  select
    v.tenant_id,
    v.actor_type,
    v.actor_ref_id,
    v.source_type,
    v.source_ids,
    v.embedding_model,
    v.created_at,
    (v.embedding <=> query_embedding)::float as distance
  from vector_embeddings v
  where v.tenant_id = match_tenant_id
  order by v.embedding <=> query_embedding
  limit match_limit;
$$;

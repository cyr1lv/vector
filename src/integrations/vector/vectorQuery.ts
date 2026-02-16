import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { requireVectorsActive } from "./activationGate.js";

export type SimilarContextRow = {
  tenant_id: string;
  actor_type: string;
  actor_ref_id: string;
  source_type: string;
  source_ids: string[];
  embedding_model: string;
  created_at: string;
  distance: number;
};

function createSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }
  return createClient(url, key);
}

export async function findSimilarContext(
  tenant_id: string,
  embedding: number[],
  limit = 5
): Promise<SimilarContextRow[]> {
  requireVectorsActive();

  if (!tenant_id) throw new Error("findSimilarContext: tenant_id is required");
  if (embedding === undefined || embedding === null) {
    throw new Error("findSimilarContext: embedding is required");
  }
  if (!Array.isArray(embedding)) {
    throw new Error("findSimilarContext: embedding must be an array");
  }
  if (embedding.length === 0) {
    throw new Error("findSimilarContext: embedding cannot be empty");
  }

  const supabase = createSupabaseClient();

  const { data, error } = await supabase.rpc("match_vector_embeddings", {
    query_embedding: embedding,
    match_tenant_id: tenant_id,
    match_limit: limit,
  });

  if (error) {
    throw new Error(`findSimilarContext: query failed - ${error.message}`);
  }

  return (data ?? []) as SimilarContextRow[];
}

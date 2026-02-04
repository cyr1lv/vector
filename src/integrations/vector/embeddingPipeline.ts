import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { embedText, EMBEDDING_MODEL_NAME } from "./embeddingClient.js";

export type EmbedContextParams = {
  tenant_id: string;
  actor_type: string;
  actor_ref_id: string;
  source_type: string;
  source_ids: string[];
  text: string;
};

function createSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }
  return createClient(url, key);
}

export async function embedContext(params: EmbedContextParams): Promise<void> {
  const { tenant_id, actor_type, actor_ref_id, source_type, source_ids, text } = params;

  if (!tenant_id) throw new Error("embedContext: tenant_id is required");
  if (!actor_type) throw new Error("embedContext: actor_type is required");
  if (!actor_ref_id) throw new Error("embedContext: actor_ref_id is required");
  if (!source_type) throw new Error("embedContext: source_type is required");
  if (source_ids === undefined || source_ids === null) {
    throw new Error("embedContext: source_ids is required");
  }
  if (!Array.isArray(source_ids)) {
    throw new Error("embedContext: source_ids must be an array");
  }
  if (!text) throw new Error("embedContext: text is required");

  const embedding = await embedText(text);
  const supabase = createSupabaseClient();

  const { error } = await supabase.from("vector_embeddings").insert({
    tenant_id,
    actor_type,
    actor_ref_id,
    source_type,
    source_ids,
    embedding,
    embedding_model: EMBEDDING_MODEL_NAME,
  });

  if (error) {
    throw new Error(`embedContext: insert failed - ${error.message}`);
  }
}

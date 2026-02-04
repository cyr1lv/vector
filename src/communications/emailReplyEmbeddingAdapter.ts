import { embedContext } from "../integrations/vector/embeddingPipeline.js";
import type { ActorType } from "./types.js";

export type { ActorType };
export type EmbedEmailReplyParams = {
  tenant_id: string;
  actor_type: ActorType;
  actor_ref_id: string;
  body: string;
  signal_ids: string[];
};

export async function embedEmailReply(params: EmbedEmailReplyParams): Promise<void> {
  const { tenant_id, actor_type, actor_ref_id, body, signal_ids } = params;

  if (!tenant_id) throw new Error("embedEmailReply: tenant_id is required");
  if (!actor_type) throw new Error("embedEmailReply: actor_type is required");
  if (!actor_ref_id) throw new Error("embedEmailReply: actor_ref_id is required");
  if (signal_ids === undefined || signal_ids === null) {
    throw new Error("embedEmailReply: signal_ids is required");
  }
  if (!Array.isArray(signal_ids)) {
    throw new Error("embedEmailReply: signal_ids must be an array");
  }
  if (!body || body.trim().length === 0) {
    throw new Error("embedEmailReply: body cannot be empty");
  }

  await embedContext({
    tenant_id,
    actor_type,
    actor_ref_id,
    source_type: "email_reply",
    source_ids: signal_ids,
    text: body.trim(),
  });
}

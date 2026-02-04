import { embedContext } from "../integrations/vector/embeddingPipeline.js";
import type { ActorType } from "./types.js";

export type { ActorType };
export type EmbedWhatsappReplyParams = {
  tenant_id: string;
  actor_type: ActorType;
  actor_ref_id: string;
  body: string;
  signal_ids: string[];
};

export async function embedWhatsappReply(params: EmbedWhatsappReplyParams): Promise<void> {
  const { tenant_id, actor_type, actor_ref_id, body, signal_ids } = params;

  if (!tenant_id) throw new Error("embedWhatsappReply: tenant_id is required");
  if (!actor_type) throw new Error("embedWhatsappReply: actor_type is required");
  if (!actor_ref_id) throw new Error("embedWhatsappReply: actor_ref_id is required");
  if (signal_ids === undefined || signal_ids === null) {
    throw new Error("embedWhatsappReply: signal_ids is required");
  }
  if (!Array.isArray(signal_ids)) {
    throw new Error("embedWhatsappReply: signal_ids must be an array");
  }
  if (!body || body.trim().length === 0) {
    throw new Error("embedWhatsappReply: body cannot be empty");
  }

  await embedContext({
    tenant_id,
    actor_type,
    actor_ref_id,
    source_type: "whatsapp_reply",
    source_ids: signal_ids,
    text: body.trim(),
  });
}

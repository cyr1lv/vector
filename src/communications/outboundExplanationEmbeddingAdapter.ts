import { embedContext } from "../integrations/vector/embeddingPipeline.js";
import type { ActorType } from "./types.js";

export type { ActorType };
export type EmbedOutboundExplanationParams = {
  tenant_id: string;
  actor_type: ActorType;
  actor_ref_id: string;
  text: string;
  decision_id: string;
  signal_ids: string[];
};

export async function embedOutboundExplanation(params: EmbedOutboundExplanationParams): Promise<void> {
  const { tenant_id, actor_type, actor_ref_id, text, decision_id, signal_ids } = params;

  if (!tenant_id) throw new Error("embedOutboundExplanation: tenant_id is required");
  if (!actor_type) throw new Error("embedOutboundExplanation: actor_type is required");
  if (!actor_ref_id) throw new Error("embedOutboundExplanation: actor_ref_id is required");
  if (!decision_id) throw new Error("embedOutboundExplanation: decision_id is required");
  if (signal_ids === undefined || signal_ids === null) {
    throw new Error("embedOutboundExplanation: signal_ids is required");
  }
  if (!Array.isArray(signal_ids)) {
    throw new Error("embedOutboundExplanation: signal_ids must be an array");
  }
  if (!text || text.trim().length === 0) {
    throw new Error("embedOutboundExplanation: text cannot be empty");
  }

  const source_ids = [decision_id, ...signal_ids];

  await embedContext({
    tenant_id,
    actor_type,
    actor_ref_id,
    source_type: "outbound_explanation",
    source_ids,
    text: text.trim(),
  });
}

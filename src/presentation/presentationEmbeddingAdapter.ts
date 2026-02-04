import type { PresentationArtefact } from "./types.js";
import { embedContext } from "../integrations/vector/embeddingPipeline.js";

export type EmbedPresentationParams = {
  tenant_id: string;
  actor_type: string;
  actor_ref_id: string;
  artefact: PresentationArtefact;
};

function toPlainText(artefact: PresentationArtefact): string {
  const parts: string[] = [];
  for (const section of artefact.sections ?? []) {
    if (section.title) parts.push(section.title);
    for (const p of section.paragraphs ?? []) {
      if (p.text) parts.push(p.text);
    }
  }
  return parts.join("\n\n");
}

export async function embedPresentation(params: EmbedPresentationParams): Promise<void> {
  const { tenant_id, actor_type, actor_ref_id, artefact } = params;

  if (!tenant_id) throw new Error("embedPresentation: tenant_id is required");
  if (!actor_type) throw new Error("embedPresentation: actor_type is required");
  if (!actor_ref_id) throw new Error("embedPresentation: actor_ref_id is required");
  if (!artefact) throw new Error("embedPresentation: artefact is required");

  const source_ids = artefact.source_signals?.signal_ids ?? [];
  const text = toPlainText(artefact);

  if (text.trim().length === 0) {
    throw new Error("embedPresentation: artefact has no text content");
  }

  await embedContext({
    tenant_id,
    actor_type,
    actor_ref_id,
    source_type: "presentation",
    source_ids,
    text,
  });
}

import type { TranscriptInput } from "./types.js";
import { embedContext } from "../integrations/vector/embeddingPipeline.js";

export type EmbedTranscriptParams = {
  tenant_id: string;
  actor_type: string;
  actor_ref_id: string;
  transcript: TranscriptInput;
};

function toPlainText(transcript: TranscriptInput): string {
  const parts: string[] = [];
  for (const block of transcript.blocks ?? []) {
    const line = [block.speaker, block.text].filter(Boolean).join(": ");
    if (line) parts.push(line);
  }
  return parts.join("\n");
}

export async function embedTranscript(params: EmbedTranscriptParams): Promise<void> {
  const { tenant_id, actor_type, actor_ref_id, transcript } = params;

  if (!tenant_id) throw new Error("embedTranscript: tenant_id is required");
  if (!actor_type) throw new Error("embedTranscript: actor_type is required");
  if (!actor_ref_id) throw new Error("embedTranscript: actor_ref_id is required");
  if (!transcript) throw new Error("embedTranscript: transcript is required");

  const source_ids = transcript.transcript_signal_ids ?? [];
  const text = toPlainText(transcript);

  if (text.trim().length === 0) {
    throw new Error("embedTranscript: transcript has no text content");
  }

  await embedContext({
    tenant_id,
    actor_type,
    actor_ref_id,
    source_type: "transcript",
    source_ids,
    text,
  });
}

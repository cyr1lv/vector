import { describe, it, expect, vi, beforeEach } from "vitest";
import { embedTranscript } from "./transcriptEmbeddingAdapter.js";

vi.mock("../integrations/vector/embeddingPipeline.js", () => ({
  embedContext: vi.fn().mockResolvedValue(undefined),
}));

const mockEmbedContext = (await import("../integrations/vector/embeddingPipeline.js")).embedContext as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("embedTranscript", () => {
  it("creates one embedding per conversation with transcript_signal_ids", async () => {
    await embedTranscript({
      tenant_id: "t1",
      actor_type: "user",
      actor_ref_id: "u1",
      transcript: {
        blocks: [
          { speaker: "A", text: "Hello" },
          { speaker: "B", text: "Hi there" },
        ],
        transcript_signal_ids: ["ts1", "ts2"],
      },
    });

    expect(mockEmbedContext).toHaveBeenCalledTimes(1);
    expect(mockEmbedContext).toHaveBeenCalledWith({
      tenant_id: "t1",
      actor_type: "user",
      actor_ref_id: "u1",
      source_type: "transcript",
      source_ids: ["ts1", "ts2"],
      text: "A: Hello\nB: Hi there",
    });
  });

  it("does not mutate transcript", async () => {
    const transcript = {
      blocks: [{ speaker: "A", text: "X" }],
      transcript_signal_ids: ["ts1"],
    };
    const origIds = transcript.transcript_signal_ids;

    await embedTranscript({
      tenant_id: "t1",
      actor_type: "u",
      actor_ref_id: "r1",
      transcript,
    });

    expect(transcript.transcript_signal_ids).toBe(origIds);
  });

  it("throws when transcript has no text content", async () => {
    await expect(
      embedTranscript({
        tenant_id: "t1",
        actor_type: "u",
        actor_ref_id: "r1",
        transcript: { blocks: [], transcript_signal_ids: [] },
      })
    ).rejects.toThrow("no text content");
  });
});

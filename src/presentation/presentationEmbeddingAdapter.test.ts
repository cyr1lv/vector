import { describe, it, expect, vi, beforeEach } from "vitest";
import { embedPresentation } from "./presentationEmbeddingAdapter.js";

vi.mock("../integrations/vector/embeddingPipeline.js", () => ({
  embedContext: vi.fn().mockResolvedValue(undefined),
}));

const mockEmbedContext = (await import("../integrations/vector/embeddingPipeline.js")).embedContext as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("embedPresentation", () => {
  it("concatenates section titles and paragraph text", async () => {
    await embedPresentation({
      tenant_id: "t1",
      actor_type: "user",
      actor_ref_id: "u1",
      artefact: {
        sections: [
          { title: "Intro", paragraphs: [{ text: "Hello" }] },
          { title: "Conclusion", paragraphs: [{ text: "Bye" }] },
        ],
        source_signals: { signal_ids: ["s1"] },
      },
    });

    expect(mockEmbedContext).toHaveBeenCalledTimes(1);
    expect(mockEmbedContext).toHaveBeenCalledWith({
      tenant_id: "t1",
      actor_type: "user",
      actor_ref_id: "u1",
      source_type: "presentation",
      source_ids: ["s1"],
      text: "Intro\n\nHello\n\nConclusion\n\nBye",
    });
  });

  it("does not mutate artefact", async () => {
    const artefact = {
      sections: [{ title: "T", paragraphs: [{ text: "P" }] }],
      source_signals: { signal_ids: ["s1"] },
    };
    const origIds = artefact.source_signals!.signal_ids!;

    await embedPresentation({
      tenant_id: "t1",
      actor_type: "u",
      actor_ref_id: "r1",
      artefact,
    });

    expect(artefact.source_signals!.signal_ids).toBe(origIds);
  });

  it("throws when artefact has no text content", async () => {
    await expect(
      embedPresentation({
        tenant_id: "t1",
        actor_type: "u",
        actor_ref_id: "r1",
        artefact: { sections: [], source_signals: { signal_ids: [] } },
      })
    ).rejects.toThrow("no text content");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { embedOutboundExplanation } from "./outboundExplanationEmbeddingAdapter.js";

vi.mock("../integrations/vector/embeddingPipeline.js", () => ({
  embedContext: vi.fn().mockResolvedValue(undefined),
}));

const mockEmbedContext = (await import("../integrations/vector/embeddingPipeline.js")).embedContext as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

describe("embedOutboundExplanation", () => {
  it("inserts with source_type outbound_explanation and decision_id + signal_ids", async () => {
    await embedOutboundExplanation({
      tenant_id: "t1",
      actor_type: "company",
      actor_ref_id: "r1",
      text: "Your application was approved.",
      decision_id: "dec-123",
      signal_ids: ["sig-1", "sig-2"],
    });
    expect(mockEmbedContext).toHaveBeenCalledWith({
      tenant_id: "t1",
      actor_type: "company",
      actor_ref_id: "r1",
      source_type: "outbound_explanation",
      source_ids: ["dec-123", "sig-1", "sig-2"],
      text: "Your application was approved.",
    });
  });

  it("throws when text is empty", async () => {
    await expect(
      embedOutboundExplanation({
        tenant_id: "t1",
        actor_type: "candidate",
        actor_ref_id: "r1",
        text: "",
        decision_id: "dec-1",
        signal_ids: [],
      })
    ).rejects.toThrow("text cannot be empty");
  });
});

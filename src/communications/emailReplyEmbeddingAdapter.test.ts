import { describe, it, expect, vi, beforeEach } from "vitest";
import { embedEmailReply } from "./emailReplyEmbeddingAdapter.js";

vi.mock("../integrations/vector/embeddingPipeline.js", () => ({
  embedContext: vi.fn().mockResolvedValue(undefined),
}));

const mockEmbedContext = (await import("../integrations/vector/embeddingPipeline.js")).embedContext as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

describe("embedEmailReply", () => {
  it("inserts with source_type email_reply and signal_ids", async () => {
    await embedEmailReply({
      tenant_id: "t1",
      actor_type: "client",
      actor_ref_id: "r1",
      body: "Thanks for your email. We agree.",
      signal_ids: ["sig-a"],
    });
    expect(mockEmbedContext).toHaveBeenCalledWith({
      tenant_id: "t1",
      actor_type: "client",
      actor_ref_id: "r1",
      source_type: "email_reply",
      source_ids: ["sig-a"],
      text: "Thanks for your email. We agree.",
    });
  });

  it("throws when body is empty", async () => {
    await expect(
      embedEmailReply({
        tenant_id: "t1",
        actor_type: "company",
        actor_ref_id: "r1",
        body: "",
        signal_ids: [],
      })
    ).rejects.toThrow("body cannot be empty");
  });
});

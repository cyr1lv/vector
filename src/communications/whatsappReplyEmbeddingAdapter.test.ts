import { describe, it, expect, vi, beforeEach } from "vitest";
import { embedWhatsappReply } from "./whatsappReplyEmbeddingAdapter.js";

vi.mock("../integrations/vector/embeddingPipeline.js", () => ({
  embedContext: vi.fn().mockResolvedValue(undefined),
}));

const mockEmbedContext = (await import("../integrations/vector/embeddingPipeline.js")).embedContext as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

describe("embedWhatsappReply", () => {
  it("inserts with source_type whatsapp_reply and signal_ids", async () => {
    await embedWhatsappReply({
      tenant_id: "t1",
      actor_type: "candidate",
      actor_ref_id: "r1",
      body: "Hello, I'm interested.",
      signal_ids: ["sig-1", "sig-2"],
    });
    expect(mockEmbedContext).toHaveBeenCalledWith({
      tenant_id: "t1",
      actor_type: "candidate",
      actor_ref_id: "r1",
      source_type: "whatsapp_reply",
      source_ids: ["sig-1", "sig-2"],
      text: "Hello, I'm interested.",
    });
  });

  it("throws when body is empty", async () => {
    await expect(
      embedWhatsappReply({
        tenant_id: "t1",
        actor_type: "company",
        actor_ref_id: "r1",
        body: "  ",
        signal_ids: [],
      })
    ).rejects.toThrow("body cannot be empty");
  });
});

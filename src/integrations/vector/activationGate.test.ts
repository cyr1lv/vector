import { describe, it, expect, vi, beforeEach } from "vitest";
import { embedContext } from "./embeddingPipeline.js";
import { findSimilarContext } from "./vectorQuery.js";

vi.mock("./embeddingClient.js", () => ({
  embedText: vi.fn().mockResolvedValue(new Array(1536).fill(0)),
  EMBEDDING_MODEL_NAME: "text-embedding-3-large",
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: vi.fn(() => ({ insert: vi.fn().mockResolvedValue({ error: null }) })) })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.VECTORS_ACTIVE;
});

describe("activationGate", () => {
  it("embedContext throws when VECTORS_ACTIVE is not set", async () => {
    await expect(
      embedContext({
        tenant_id: "t1",
        actor_type: "u",
        actor_ref_id: "r1",
        source_type: "x",
        source_ids: [],
        text: "x",
      })
    ).rejects.toThrow("Vectors are inactive");
  });

  it("findSimilarContext throws when VECTORS_ACTIVE is not set", async () => {
    await expect(findSimilarContext("t1", new Array(1536).fill(0), 5)).rejects.toThrow("Vectors are inactive");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { findSimilarContext } from "./vectorQuery.js";

const mockRpc = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
});

describe("findSimilarContext", () => {
  it("calls rpc with cosine distance params", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    await findSimilarContext("t1", new Array(1536).fill(0.1), 5);

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("match_vector_embeddings", {
      query_embedding: expect.any(Array),
      match_tenant_id: "t1",
      match_limit: 5,
    });
  });

  it("returns rows ordered by distance", async () => {
    const rows = [
      { tenant_id: "t1", actor_type: "u", actor_ref_id: "r1", source_type: "x", source_ids: [], embedding_model: "m", created_at: "2025-01-01", distance: 0.1 },
      { tenant_id: "t1", actor_type: "u", actor_ref_id: "r2", source_type: "x", source_ids: [], embedding_model: "m", created_at: "2025-01-01", distance: 0.3 },
    ];
    mockRpc.mockResolvedValue({ data: rows, error: null });

    const result = await findSimilarContext("t1", new Array(1536).fill(0));

    expect(result).toEqual(rows);
  });

  it("uses default limit of 5", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await findSimilarContext("t1", new Array(1536).fill(0));
    expect(mockRpc).toHaveBeenCalledWith("match_vector_embeddings", expect.objectContaining({ match_limit: 5 }));
  });

  it("throws when tenant_id is missing", async () => {
    await expect(findSimilarContext("", [0.1], 5)).rejects.toThrow("tenant_id is required");
  });

  it("throws when embedding is empty", async () => {
    await expect(findSimilarContext("t1", [], 5)).rejects.toThrow("embedding cannot be empty");
  });
});

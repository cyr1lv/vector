import { describe, it, expect, vi, beforeEach } from "vitest";
import { embedContext } from "./embeddingPipeline.js";

vi.mock("./embeddingClient.js", () => ({
  embedText: vi.fn(),
  EMBEDDING_MODEL_NAME: "text-embedding-3-large",
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  })),
}));

const mockEmbedText = (await import("./embeddingClient.js")).embedText as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.VECTORS_ACTIVE = "true";
  process.env.SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
});

describe("embedContext", () => {
  it("calls embedText with provided text", async () => {
    const fakeEmbedding = new Array(1536).fill(0.1);
    mockEmbedText.mockResolvedValue(fakeEmbedding);

    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const fromMock = vi.fn().mockReturnValue({ insert: insertMock });
    const createClient = (await import("@supabase/supabase-js")).createClient as ReturnType<typeof vi.fn>;
    createClient.mockReturnValue({ from: fromMock });

    await embedContext({
      tenant_id: "t1",
      actor_type: "user",
      actor_ref_id: "u1",
      source_type: "presentation",
      source_ids: ["s1", "s2"],
      text: "hello world",
    });

    expect(mockEmbedText).toHaveBeenCalledTimes(1);
    expect(mockEmbedText).toHaveBeenCalledWith("hello world");
  });

  it("inserts exactly one row with correct payload", async () => {
    const fakeEmbedding = new Array(1536).fill(0.1);
    mockEmbedText.mockResolvedValue(fakeEmbedding);

    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const fromMock = vi.fn().mockReturnValue({ insert: insertMock });
    const createClient = (await import("@supabase/supabase-js")).createClient as ReturnType<typeof vi.fn>;
    createClient.mockReturnValue({ from: fromMock });

    await embedContext({
      tenant_id: "t1",
      actor_type: "user",
      actor_ref_id: "u1",
      source_type: "presentation",
      source_ids: ["s1"],
      text: "foo",
    });

    expect(fromMock).toHaveBeenCalledWith("vector_embeddings");
    expect(insertMock).toHaveBeenCalledTimes(1);
    const insertPayload = insertMock.mock.calls[0][0];
    expect(insertPayload).toEqual({
      tenant_id: "t1",
      actor_type: "user",
      actor_ref_id: "u1",
      source_type: "presentation",
      source_ids: ["s1"],
      embedding: fakeEmbedding,
      embedding_model: "text-embedding-3-large",
    });
  });

  it("does not mutate input params", async () => {
    mockEmbedText.mockResolvedValue(new Array(1536).fill(0));
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const createClient = (await import("@supabase/supabase-js")).createClient as ReturnType<typeof vi.fn>;
    createClient.mockReturnValue({ from: vi.fn().mockReturnValue({ insert: insertMock }) });

    const sourceIds = ["a", "b"];
    const params = {
      tenant_id: "t1",
      actor_type: "u",
      actor_ref_id: "r1",
      source_type: "presentation",
      source_ids: sourceIds,
      text: "x",
    };

    await embedContext(params);

    expect(params.source_ids).toBe(sourceIds);
    expect(params.source_ids).toEqual(["a", "b"]);
  });

  it("throws when tenant_id is missing", async () => {
    await expect(
      embedContext({
        tenant_id: "",
        actor_type: "u",
        actor_ref_id: "r1",
        source_type: "x",
        source_ids: [],
        text: "x",
      })
    ).rejects.toThrow("tenant_id is required");
  });

  it("throws when source_ids is not an array", async () => {
    await expect(
      embedContext({
        tenant_id: "t1",
        actor_type: "u",
        actor_ref_id: "r1",
        source_type: "x",
        source_ids: "invalid" as unknown as string[],
        text: "x",
      })
    ).rejects.toThrow("source_ids must be an array");
  });
});

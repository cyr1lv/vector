import { describe, it, expect, vi, beforeEach } from "vitest";
import { embedText } from "./embeddingClient.js";

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    embeddings: {
      create: vi.fn().mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0.42) }],
      }),
    },
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("embedText", () => {
  it("returns 1536-dim vector from OpenAI", async () => {
    const result = await embedText("test");
    expect(result).toHaveLength(1536);
    expect(result[0]).toBe(0.42);
  });

  it("throws when text is empty", async () => {
    await expect(embedText("")).rejects.toThrow("text cannot be empty");
    await expect(embedText("   ")).rejects.toThrow("text cannot be empty");
  });

  it("throws when text is not a string", async () => {
    await expect(embedText(null as unknown as string)).rejects.toThrow("text is required");
    await expect(embedText(undefined as unknown as string)).rejects.toThrow("text is required");
  });
});

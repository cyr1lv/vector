import OpenAI from "openai";

const EMBEDDING_MODEL = "text-embedding-3-large";
const EMBEDDING_DIMS = 1536;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function embedText(text: string): Promise<number[]> {
  if (text === undefined || text === null) {
    throw new Error("embedText: text is required");
  }
  if (typeof text !== "string") {
    throw new Error("embedText: text must be a string");
  }
  if (text.trim().length === 0) {
    throw new Error("embedText: text cannot be empty");
  }

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMS,
    encoding_format: "float",
  });

  return response.data[0].embedding;
}

export const EMBEDDING_MODEL_NAME = EMBEDDING_MODEL;

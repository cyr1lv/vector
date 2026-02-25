export type VectorEvidenceContract = {
  status: "PRESENT" | "ABSENT";
  sources?: string[];
  summary?: string;
};

export function buildVectorEvidenceContract(input: VectorEvidenceContract): VectorEvidenceContract {
  return {
    status: input.status,
    sources: Array.isArray(input.sources) ? input.sources : undefined,
    summary: typeof input.summary === "string" ? input.summary : undefined,
  };
}


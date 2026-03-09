import { describe, expect, it } from "vitest";
import { handleSoftwareSpecializationPreview } from "./softwareSpecializationHandler.js";

describe("handleSoftwareSpecializationPreview", () => {
  it("returns 200 with the combined transport payload", () => {
    const result = handleSoftwareSpecializationPreview({
      request_id: "req-1",
      tenant_id: "tenant-1",
      candidate_id: "cand-1",
      vacancy_id: "vac-1",
      candidate_text: "Frontend engineer building React interfaces and CSS-heavy UIs.",
      vacancy_text: "Senior Frontend Developer for React and modern web UI development.",
    });

    expect(result.statusCode).toBe(200);
    if (result.statusCode !== 200) throw new Error("expected 200 response");
    expect(result.body.payload).toEqual({
      "fit.candidate.software_specialization_vector": "frontend",
      "fit.vacancy.software_specialization_vector": "frontend",
      "fit.software_specialization_vector_confidence": expect.stringMatching(/low|medium|high/),
      "fit.software_specialization_vector_source": "vector_service_v1",
    });
  });

  it("returns 400 for missing texts", () => {
    const result = handleSoftwareSpecializationPreview({
      candidate_text: "",
      vacancy_text: "   ",
    });

    expect(result.statusCode).toBe(400);
    expect(result.body).toEqual({
      error: "INVALID_REQUEST",
      message: expect.stringContaining("candidate_text or vacancy_text is required"),
    });
  });

  it("returns 400 when the body is not an object", () => {
    const result = handleSoftwareSpecializationPreview(null);

    expect(result.statusCode).toBe(400);
    expect(result.body).toEqual({
      error: "INVALID_REQUEST",
      message: "Request body must be an object.",
    });
  });
});

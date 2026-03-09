import { describe, expect, it } from "vitest";
import { buildSoftwareSpecializationTransportResponse } from "./softwareSpecializationTransport.js";

describe("buildSoftwareSpecializationTransportResponse", () => {
  it("builds a combined platform payload for candidate and vacancy", () => {
    const result = buildSoftwareSpecializationTransportResponse({
      request_id: "req-1",
      tenant_id: "tenant-1",
      candidate_id: "cand-1",
      vacancy_id: "vac-1",
      candidate_text:
        "Frontend engineer building React user interfaces, CSS, HTML and browser-based applications.",
      vacancy_text:
        "Senior Frontend Developer needed for UI development in React and modern web applications.",
    });

    expect(result.status).toBe("OK");
    expect(result.payload).toEqual({
      "fit.candidate.software_specialization_vector": "frontend",
      "fit.vacancy.software_specialization_vector": "frontend",
      "fit.software_specialization_vector_confidence": expect.stringMatching(/low|medium|high/),
      "fit.software_specialization_vector_source": "vector_service_v1",
    });
    expect(result.meta.emitted_keys).toEqual([
      "fit.candidate.software_specialization_vector",
      "fit.vacancy.software_specialization_vector",
      "fit.software_specialization_vector_confidence",
      "fit.software_specialization_vector_source",
    ]);
  });

  it("emits single-side payload when only one side has a software hint", () => {
    const result = buildSoftwareSpecializationTransportResponse({
      candidate_text: "Embedded software engineer with firmware, RTOS and microcontroller experience.",
      vacancy_text: "Administrative support role focused on planning and coordination.",
    });

    expect(result.payload).toEqual({
      "fit.candidate.software_specialization_vector": "embedded",
      "fit.software_specialization_vector_confidence": expect.stringMatching(/low|medium|high/),
      "fit.software_specialization_vector_source": "vector_service_v1",
    });
    expect(result.contracts.vacancy.status).toBe("ABSENT");
  });

  it("throws when both texts are missing", () => {
    expect(() =>
      buildSoftwareSpecializationTransportResponse({
        candidate_text: "   ",
        vacancy_text: "",
      })
    ).toThrow("candidate_text or vacancy_text is required");
  });
});

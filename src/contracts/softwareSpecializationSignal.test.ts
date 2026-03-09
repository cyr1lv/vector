import { describe, expect, it } from "vitest";
import { buildSoftwareSpecializationSignalContract } from "./softwareSpecializationSignal.js";

describe("buildSoftwareSpecializationSignalContract", () => {
  it("returns present contract with platform payload", () => {
    const result = buildSoftwareSpecializationSignalContract({
      side: "candidate",
      text: "Senior backend engineer building Java APIs, server-side services and data access layers.",
    });

    expect(result.status).toBe("PRESENT");
    expect(result.side).toBe("candidate");
    expect(result.hint?.specialization).toBe("backend");
    expect(result.payload).toEqual({
      "fit.candidate.software_specialization_vector": "backend",
      "fit.software_specialization_vector_confidence": expect.stringMatching(/low|medium|high/),
      "fit.software_specialization_vector_source": "vector_service_v1",
    });
  });

  it("returns absent contract when text is not software-specific", () => {
    const result = buildSoftwareSpecializationSignalContract({
      side: "vacancy",
      text: "Office manager focused on planning, administration and stakeholder coordination.",
    });

    expect(result).toEqual({
      status: "ABSENT",
      side: "vacancy",
    });
  });
});

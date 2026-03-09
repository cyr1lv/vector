import { describe, expect, it } from "vitest";
import {
  buildPlatformSoftwareSpecializationSignalPayload,
  inferSoftwareSpecialization,
  retrieveSoftwareSpecializationHints,
} from "./softwareSpecializationAssist.js";

describe("softwareSpecializationAssist", () => {
  it("infers embedded specialization from firmware and PLC terms", () => {
    const hint = inferSoftwareSpecialization(
      "Embedded software engineer with firmware, RTOS, PLC, SCADA, HMI and device driver experience."
    );

    expect(hint?.specialization).toBe("embedded");
    expect(hint?.confidence_label).toMatch(/medium|high/);
  });

  it("infers frontend specialization from UI and framework terms", () => {
    const hint = inferSoftwareSpecialization(
      "Front-end engineer building user interfaces with React, HTML, CSS and modern UI development practices."
    );

    expect(hint?.specialization).toBe("frontend");
  });

  it("infers fullstack specialization from explicit full stack title", () => {
    const hint = inferSoftwareSpecialization(
      "Full Stack Developer building React frontends and Node.js REST APIs end to end."
    );

    expect(hint?.specialization).toBe("fullstack");
  });

  it("returns multiple ranked hints for mixed software profiles", () => {
    const hints = retrieveSoftwareSpecializationHints(
      "Mobile engineer with React Native and Flutter who also contributes to frontend web applications."
    );

    expect(hints.length).toBeGreaterThan(0);
    expect(hints.map((hint) => hint.specialization)).toEqual(
      expect.arrayContaining(["mobile", "frontend"])
    );
    expect(hints[0]?.source).toBe("vector_service_v1");
  });

  it("prefers frontend over generic web for explicit react ui profiles", () => {
    const hint = inferSoftwareSpecialization(
      "Frontend engineer building React interfaces, CSS and browser-based web applications."
    );

    expect(hint?.specialization).toBe("frontend");
  });

  it("builds the platform payload shape for vacancy hints", () => {
    const payload = buildPlatformSoftwareSpecializationSignalPayload({
      side: "vacancy",
      text: "Senior Frontend Developer working with React, HTML, CSS and UI development.",
    });

    expect(payload).toEqual({
      "fit.vacancy.software_specialization_vector": "frontend",
      "fit.software_specialization_vector_confidence": expect.stringMatching(/low|medium|high/),
      "fit.software_specialization_vector_source": "vector_service_v1",
    });
  });
});

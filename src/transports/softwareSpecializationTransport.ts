import {
  type PlatformSoftwareSpecializationSignalPayload,
  type VectorSoftwareSpecializationHint,
} from "../integrations/vector/softwareSpecializationAssist.js";
import { buildSoftwareSpecializationSignalContract } from "../contracts/softwareSpecializationSignal.js";

export type SoftwareSpecializationTransportRequest = {
  request_id?: string;
  tenant_id?: string;
  candidate_id?: string;
  vacancy_id?: string;
  candidate_text?: string;
  vacancy_text?: string;
};

export type SoftwareSpecializationTransportResponse = {
  status: "OK";
  request: Omit<SoftwareSpecializationTransportRequest, "candidate_text" | "vacancy_text">;
  contracts: {
    candidate: ReturnType<typeof buildSoftwareSpecializationSignalContract>;
    vacancy: ReturnType<typeof buildSoftwareSpecializationSignalContract>;
  };
  payload: PlatformSoftwareSpecializationSignalPayload | null;
  meta: {
    source: "vector_service_v1";
    overall_confidence: "low" | "medium" | "high" | null;
    emitted_keys: string[];
  };
};

function combineConfidenceLabel(
  candidateHint?: VectorSoftwareSpecializationHint,
  vacancyHint?: VectorSoftwareSpecializationHint
): "low" | "medium" | "high" | null {
  const labels = [candidateHint?.confidence_label, vacancyHint?.confidence_label].filter(
    Boolean
  ) as Array<"low" | "medium" | "high">;
  if (labels.length === 0) return null;
  if (labels.includes("low")) return "low";
  if (labels.includes("medium")) return "medium";
  return "high";
}

export function buildSoftwareSpecializationTransportResponse(
  request: SoftwareSpecializationTransportRequest
): SoftwareSpecializationTransportResponse {
  const candidateText = request.candidate_text?.trim() ?? "";
  const vacancyText = request.vacancy_text?.trim() ?? "";
  if (!candidateText && !vacancyText) {
    throw new Error(
      "buildSoftwareSpecializationTransportResponse: candidate_text or vacancy_text is required"
    );
  }

  const candidate = buildSoftwareSpecializationSignalContract({
    side: "candidate",
    text: candidateText,
  });
  const vacancy = buildSoftwareSpecializationSignalContract({
    side: "vacancy",
    text: vacancyText,
  });

  const overallConfidence = combineConfidenceLabel(candidate.hint, vacancy.hint);

  const payload: PlatformSoftwareSpecializationSignalPayload = {};
  if (candidate.hint) {
    payload["fit.candidate.software_specialization_vector"] = candidate.hint.specialization;
  }
  if (vacancy.hint) {
    payload["fit.vacancy.software_specialization_vector"] = vacancy.hint.specialization;
  }
  if (overallConfidence) {
    payload["fit.software_specialization_vector_confidence"] = overallConfidence;
    payload["fit.software_specialization_vector_source"] = "vector_service_v1";
  }

  const emittedKeys = Object.keys(payload);

  return {
    status: "OK",
    request: {
      request_id: request.request_id,
      tenant_id: request.tenant_id,
      candidate_id: request.candidate_id,
      vacancy_id: request.vacancy_id,
    },
    contracts: {
      candidate,
      vacancy,
    },
    payload: emittedKeys.length > 0 ? payload : null,
    meta: {
      source: "vector_service_v1",
      overall_confidence: overallConfidence,
      emitted_keys: emittedKeys,
    },
  };
}

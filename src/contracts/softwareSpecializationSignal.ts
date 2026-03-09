import {
  buildPlatformSoftwareSpecializationSignalPayload,
  inferSoftwareSpecialization,
  type PlatformSoftwareSpecializationSignalPayload,
  type VectorSoftwareSpecializationHint,
} from "../integrations/vector/softwareSpecializationAssist.js";

export type SoftwareSpecializationSignalContract = {
  status: "PRESENT" | "ABSENT";
  side: "candidate" | "vacancy";
  payload?: PlatformSoftwareSpecializationSignalPayload;
  hint?: VectorSoftwareSpecializationHint;
};

export function buildSoftwareSpecializationSignalContract(params: {
  side: "candidate" | "vacancy";
  text: string;
}): SoftwareSpecializationSignalContract {
  const hint = inferSoftwareSpecialization(params.text);
  if (!hint) {
    return {
      status: "ABSENT",
      side: params.side,
    };
  }

  return {
    status: "PRESENT",
    side: params.side,
    hint,
    payload: buildPlatformSoftwareSpecializationSignalPayload(params) ?? undefined,
  };
}

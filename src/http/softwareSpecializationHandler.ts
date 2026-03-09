import {
  buildSoftwareSpecializationTransportResponse,
  type SoftwareSpecializationTransportRequest,
  type SoftwareSpecializationTransportResponse,
} from "../transports/softwareSpecializationTransport.js";

export type SoftwareSpecializationHttpResponse =
  | {
      statusCode: 200;
      body: SoftwareSpecializationTransportResponse;
    }
  | {
      statusCode: 400;
      body: {
        error: "INVALID_REQUEST";
        message: string;
      };
    };

function asRequest(
  input: unknown
): SoftwareSpecializationTransportRequest | null {
  if (!input || typeof input !== "object") return null;
  return input as SoftwareSpecializationTransportRequest;
}

export function handleSoftwareSpecializationPreview(
  body: unknown
): SoftwareSpecializationHttpResponse {
  const request = asRequest(body);
  if (!request) {
    return {
      statusCode: 400,
      body: {
        error: "INVALID_REQUEST",
        message: "Request body must be an object.",
      },
    };
  }

  try {
    return {
      statusCode: 200,
      body: buildSoftwareSpecializationTransportResponse(request),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: {
        error: "INVALID_REQUEST",
        message: error instanceof Error ? error.message : "Invalid request.",
      },
    };
  }
}

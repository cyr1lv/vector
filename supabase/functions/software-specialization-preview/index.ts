import { handleSoftwareSpecializationPreview } from "../../../src/http/softwareSpecializationHandler.ts";

const jsonHeaders = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, x-tenant-id",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: jsonHeaders,
    });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "METHOD_NOT_ALLOWED",
        message: "Use POST.",
      }),
      {
        status: 405,
        headers: jsonHeaders,
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: "INVALID_REQUEST",
        message: "Request body must be valid JSON.",
      }),
      {
        status: 400,
        headers: jsonHeaders,
      }
    );
  }

  const response = handleSoftwareSpecializationPreview(body);
  return new Response(JSON.stringify(response.body), {
    status: response.statusCode,
    headers: jsonHeaders,
  });
});

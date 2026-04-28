/**
 * Minimal standalone HTTP surface for Railway / health probes.
 * Domain logic lives in other modules; this process only proves the package boots independently.
 */
import http from "node:http";

const port = Number(process.env.PORT ?? "8787");

const server = http.createServer((req, res) => {
  const path = req.url?.split("?")[0] ?? "/";
  if (path === "/" || path === "/health" || path === "/healthz") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        ok: true,
        service: "vector-context-layer",
        uptime_s: Math.round(process.uptime()),
      })
    );
    return;
  }
  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("not found");
});

server.listen(port, "0.0.0.0", () => {
  console.log(`[vector] listening on 0.0.0.0:${port}`);
});

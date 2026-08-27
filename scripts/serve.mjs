// Production entry point — runs the app as a plain Node HTTP server.
//
// Why this exists instead of a framework-provided one: `vite build` (with
// this project's TanStack Start + Nitro versions) only emits a Web-standard
// `{ fetch(request) }` handler in dist/server/server.js — there is no code
// anywhere in the build that opens a port. The obvious next step, Nitro's
// own "node-server" preset (via @tanstack/nitro-v2-vite-plugin), does add a
// self-starting server, but the version available at the time this was
// written throws `TypeError: Invalid URL` on every real request — a bug in
// its bundled `srvx` request adapter failing to build an absolute URL from
// a raw Node request, not something in this app's own code. Fully
// reproduced, traced to a matching upstream TanStack/router issue, and
// deemed not worth chasing further across beta releases.
//
// This file is the replacement: a small, boring, well-understood Node
// http-to-fetch bridge we own outright, with no dependency on that adapter
// working correctly. If a future TanStack Start / Nitro upgrade fixes the
// underlying bug, this file can be deleted in favor of their preset again.
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = join(scriptDir, "..");
const clientDir = join(repoRoot, "dist", "client");

// Dynamic import() requires a file:// URL on Windows — a raw "D:\..." path
// throws ERR_UNSUPPORTED_ESM_URL_SCHEME.
const { default: handler } = await import(
  pathToFileURL(join(repoRoot, "dist", "server", "server.js")).href
);

const MIME_TYPES = {
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

// Resolves a request path to a file under dist/client, refusing anything
// that would escape clientDir (e.g. "/../../etc/passwd") via a decoded
// "..").
function resolveStaticFile(pathname) {
  const decoded = decodeURIComponent(pathname);
  const resolved = normalize(join(clientDir, decoded));
  if (
    resolved !== clientDir &&
    !resolved.startsWith(clientDir + "\\") &&
    !resolved.startsWith(clientDir + "/")
  ) {
    return null;
  }
  return resolved;
}

function toWebRequest(req, url) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) for (const v of value) headers.append(key, v);
    else headers.set(key, value);
  }
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  return new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? Readable.toWeb(req) : undefined,
    duplex: hasBody ? "half" : undefined,
  });
}

async function sendWebResponse(response, res) {
  res.statusCode = response.status;
  for (const [key, value] of response.headers.entries()) {
    if (key.toLowerCase() === "set-cookie") continue;
    res.setHeader(key, value);
  }
  // Headers.entries() collapses multiple Set-Cookie values into one comma-
  // joined string, which browsers can't parse as separate cookies —
  // getSetCookie() is the only way to get them back out individually.
  const cookies = response.headers.getSetCookie?.() ?? [];
  if (cookies.length > 0) res.setHeader("set-cookie", cookies);

  if (!response.body) {
    res.end();
    return;
  }
  for await (const chunk of response.body) res.write(chunk);
  res.end();
}

const server = createServer(async (req, res) => {
  try {
    const host = req.headers.host ?? `localhost:${process.env["PORT"] ?? 3000}`;
    const url = new URL(req.url ?? "/", `http://${host}`);

    if (req.method === "GET" || req.method === "HEAD") {
      const staticPath = resolveStaticFile(url.pathname);
      if (staticPath && existsSync(staticPath) && statSync(staticPath).isFile()) {
        res.writeHead(200, {
          "content-type": MIME_TYPES[extname(staticPath)] ?? "application/octet-stream",
          "cache-control": url.pathname.startsWith("/assets/")
            ? "public, max-age=31536000, immutable"
            : "public, max-age=3600",
        });
        createReadStream(staticPath).pipe(res);
        return;
      }
    }

    const response = await handler.fetch(toWebRequest(req, url));
    await sendWebResponse(response, res);
  } catch (err) {
    console.error("[serve] request failed:", err);
    if (!res.headersSent) res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end("Internal Server Error");
  }
});

const port = Number(process.env["PORT"]) || 3000;
const host = process.env["HOST"] || "0.0.0.0";
server.listen(port, host, () => {
  console.log(`Listening on http://${host}:${port}`);
});

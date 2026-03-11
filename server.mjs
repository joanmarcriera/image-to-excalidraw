import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const examplesDir = path.join(__dirname, "examples");
const libDir = path.join(__dirname, "lib");
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml; charset=utf-8"],
]);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(text);
}

function safeJoin(baseDir, pathname) {
  const normalizedPath = path.normalize(path.join(baseDir, pathname));
  if (
    normalizedPath !== baseDir &&
    !normalizedPath.startsWith(`${baseDir}${path.sep}`)
  ) {
    return null;
  }
  return normalizedPath;
}

async function serveStatic(response, filepath) {
  try {
    const data = await readFile(filepath);
    const extension = path.extname(filepath);

    response.writeHead(200, {
      "Content-Type":
        mimeTypes.get(extension) || "application/octet-stream; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(data);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      sendText(response, 404, "Not found");
      return;
    }
    sendText(response, 500, "Failed to read file");
  }
}

const server = createServer(async (request, response) => {
  if (!request.url) {
    sendText(response, 400, "Missing URL");
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const pathname = url.pathname;

  if (request.method === "GET" && pathname === "/api/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && pathname === "/") {
    await serveStatic(response, path.join(publicDir, "index.html"));
    return;
  }

  if (request.method === "GET" && pathname.startsWith("/examples/")) {
    const filepath = safeJoin(examplesDir, pathname.replace("/examples/", ""));
    if (!filepath) {
      sendText(response, 404, "Not found");
      return;
    }
    await serveStatic(response, filepath);
    return;
  }

  if (request.method === "GET" && pathname.startsWith("/lib/")) {
    const filepath = safeJoin(libDir, pathname.replace("/lib/", ""));
    if (!filepath) {
      sendText(response, 404, "Not found");
      return;
    }
    await serveStatic(response, filepath);
    return;
  }

  if (request.method === "GET") {
    const filepath = safeJoin(publicDir, pathname.slice(1));
    if (!filepath) {
      sendText(response, 404, "Not found");
      return;
    }
    await serveStatic(response, filepath);
    return;
  }

  sendText(response, 405, "Method not allowed");
});

server.listen(port, host, () => {
  console.log(`image-to-excalidraw running at http://${host}:${port}`);
});

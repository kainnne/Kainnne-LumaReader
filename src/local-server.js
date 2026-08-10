"use strict";

const http = require("node:http");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { fileURLToPath, pathToFileURL } = require("node:url");

const APP_NAME = "Kainnne LumaReader";
const APP_VERSION = "2.1.0";
const DOCUMENT_EXTENSIONS = new Set([".md", ".mkd", ".mdx", ".markdown"]);
const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;
const MAX_MEDIA_BYTES = 32 * 1024 * 1024;
const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".github",
  ".idea",
  ".vscode",
  "__pycache__",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "release",
]);

const MIME_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
  [".mkd", "text/markdown; charset=utf-8"],
  [".mdx", "text/markdown; charset=utf-8"],
  [".markdown", "text/markdown; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gif", "image/gif"],
  [".webp", "image/webp"],
  [".svg", "image/svg+xml"],
  [".mp3", "audio/mpeg"],
  [".wav", "audio/wav"],
  [".ogg", "audio/ogg"],
  [".mp4", "video/mp4"],
  [".webm", "video/webm"],
  [".woff2", "font/woff2"],
  [".icns", "image/icns"],
]);

const INCLUDE_PATTERNS = [
  /^\s*!INCLUDE\s+["']([^"']+)["']\s*$/i,
  /^\s*\{\{\s*include\s*:\s*([^}]+?)\s*\}\}\s*$/i,
];

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function isDocument(filePath) {
  return DOCUMENT_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function contentType(filePath) {
  return MIME_TYPES.get(path.extname(filePath).toLowerCase()) || "application/octet-stream";
}

function publicFileRecord(root, filePath, stat) {
  const relative = path.relative(root, filePath).split(path.sep).join("/");
  const parts = relative.split("/");
  return {
    path: relative,
    name: path.basename(filePath),
    extension: path.extname(filePath).toLowerCase(),
    folder: parts.length > 1 ? parts.slice(0, -1).join("/") : "",
    project: parts.length > 1 ? parts[0] : path.basename(root),
    modified: new Date(stat.mtimeMs).toISOString(),
    modifiedNs: Math.round(stat.mtimeMs * 1_000_000),
    size: stat.size,
  };
}

async function scanDocuments(root) {
  if (!root) return [];
  const records = [];

  async function visit(directory) {
    let entries;
    try {
      entries = await fsp.readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    await Promise.all(entries.map(async (entry) => {
      if (entry.name.startsWith(".")) return;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name) && !entry.name.endsWith(".app")) await visit(absolute);
        return;
      }
      if (!entry.isFile() || !isDocument(absolute)) return;
      try {
        const stat = await fsp.stat(absolute);
        records.push(publicFileRecord(root, absolute, stat));
      } catch {
        // A disappearing file should not prevent the rest of the library from loading.
      }
    }));
  }

  await visit(root);
  return records.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: "base" }));
}

async function readDocument(filePath) {
  if (!isDocument(filePath)) throw new Error("Unsupported document type");
  const stat = await fsp.stat(filePath);
  if (!stat.isFile()) throw new Error("Document not found");
  if (stat.size > MAX_DOCUMENT_BYTES) throw new Error("Document exceeds the 8 MB preview limit");
  return { text: await fsp.readFile(filePath, "utf8"), stat };
}

async function expandIncludes(text, baseDirectory, boundary, seen = new Set(), depth = 0) {
  if (depth >= 6) return text;
  const output = [];
  for (const line of text.split(/\r?\n/)) {
    let includePath = null;
    for (const pattern of INCLUDE_PATTERNS) {
      const match = pattern.exec(line);
      if (match) {
        includePath = match[1].trim();
        break;
      }
    }
    if (!includePath) {
      output.push(line);
      continue;
    }
    const candidate = path.resolve(baseDirectory, decodeURIComponent(includePath));
    if ((boundary && !isInside(boundary, candidate)) || seen.has(candidate)) {
      output.push(`> [!WARNING]\n> Include blocked: \`${includePath}\``);
      continue;
    }
    try {
      const included = await readDocument(candidate);
      output.push(await expandIncludes(included.text, path.dirname(candidate), boundary, new Set([...seen, candidate]), depth + 1));
    } catch {
      output.push(`> [!WARNING]\n> Include unavailable: \`${includePath}\``);
    }
  }
  return output.join("\n");
}

async function localPayload(filePath, sourceType, root, publicPath = null) {
  const { text, stat } = await readDocument(filePath);
  const boundary = sourceType === "project" ? root : path.dirname(filePath);
  return {
    path: sourceType === "project" ? publicPath : pathToFileURL(filePath).href,
    name: path.basename(filePath),
    extension: path.extname(filePath).toLowerCase(),
    sourceType,
    base: `${pathToFileURL(path.dirname(filePath)).href}/`,
    text,
    renderText: await expandIncludes(text, path.dirname(filePath), boundary, new Set([filePath])),
    modified: new Date(stat.mtimeMs).toISOString(),
    modifiedNs: Math.round(stat.mtimeMs * 1_000_000),
    size: stat.size,
  };
}

async function remotePayload(source) {
  const url = new URL(source);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP and HTTPS URLs are supported");
  const response = await fetch(url, {
    headers: { "User-Agent": `${APP_NAME}/${APP_VERSION}` },
    redirect: "follow",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Remote document returned HTTP ${response.status}`);
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > MAX_DOCUMENT_BYTES) throw new Error("Remote document exceeds the 8 MB preview limit");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_DOCUMENT_BYTES) throw new Error("Remote document exceeds the 8 MB preview limit");
  const finalUrl = response.url || source;
  return {
    path: finalUrl,
    name: path.basename(new URL(finalUrl).pathname) || "remote.md",
    extension: path.extname(new URL(finalUrl).pathname).toLowerCase() || ".md",
    sourceType: "remote",
    base: new URL("./", finalUrl).href,
    text: bytes.toString("utf8"),
    renderText: bytes.toString("utf8"),
    modified: null,
    modifiedNs: null,
    size: bytes.length,
  };
}

function sendJson(response, payload, status = 200) {
  const body = Buffer.from(JSON.stringify(payload));
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": body.length,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(body);
}

function sendError(response, error, status = 404) {
  sendJson(response, { error: error.message || String(error), type: error.name || "Error" }, status);
}

class LocalReaderService {
  constructor({ rendererRoot, libraryRoot = null }) {
    this.rendererRoot = path.resolve(rendererRoot);
    this.libraryRoot = null;
    this.server = null;
    this.port = null;
    if (libraryRoot) this.setLibraryRoot(libraryRoot);
  }

  setLibraryRoot(directory) {
    if (!directory) {
      this.libraryRoot = null;
      return null;
    }
    const resolved = path.resolve(directory);
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) throw new Error("The selected library is not a directory");
    this.libraryRoot = resolved;
    return resolved;
  }

  getLibraryRoot() {
    return this.libraryRoot;
  }

  resolveProjectDocument(rawPath) {
    if (!this.libraryRoot) throw new Error("Choose a library folder first");
    const candidate = path.resolve(this.libraryRoot, decodeURIComponent(rawPath).replace(/^[/\\]+/, ""));
    if (!isInside(this.libraryRoot, candidate) || !isDocument(candidate)) throw new Error("Document is outside the selected library");
    return candidate;
  }

  sourceToLocalPath(source) {
    if (source.startsWith("file://")) return { filePath: fileURLToPath(source), sourceType: "external" };
    if (path.isAbsolute(source)) return { filePath: path.resolve(source), sourceType: "external" };
    return { filePath: this.resolveProjectDocument(source), sourceType: "project" };
  }

  async openSource(source) {
    const clean = decodeURIComponent(String(source || "").trim());
    if (/^https?:\/\//i.test(clean)) return remotePayload(clean);
    const { filePath, sourceType } = this.sourceToLocalPath(clean);
    const publicPath = sourceType === "project" ? path.relative(this.libraryRoot, filePath).split(path.sep).join("/") : null;
    return localPayload(filePath, sourceType, this.libraryRoot, publicPath);
  }

  resolveMedia(rawPath, fromSource) {
    const { filePath: sourceFile, sourceType } = this.sourceToLocalPath(fromSource);
    const requested = decodeURIComponent(String(rawPath || "").trim());
    let candidate;
    if (path.isAbsolute(requested)) {
      candidate = sourceType === "project"
        ? path.resolve(this.libraryRoot, requested.replace(/^[/\\]+/, ""))
        : path.resolve(requested);
    } else {
      candidate = path.resolve(path.dirname(sourceFile), requested);
    }
    const boundary = sourceType === "project" ? this.libraryRoot : path.dirname(sourceFile);
    if (!isInside(boundary, candidate)) throw new Error("Media is outside the allowed document folder");
    return candidate;
  }

  async handleApi(request, response, url) {
    if (url.pathname === "/api/health") {
      sendJson(response, { ok: true, app: APP_NAME, version: APP_VERSION, root: this.libraryRoot, selected: Boolean(this.libraryRoot) });
      return true;
    }
    if (url.pathname === "/api/settings") {
      sendJson(response, { root: this.libraryRoot, selected: Boolean(this.libraryRoot) });
      return true;
    }
    if (url.pathname === "/api/files") {
      sendJson(response, { root: this.libraryRoot, extensions: [...DOCUMENT_EXTENSIONS].sort(), files: await scanDocuments(this.libraryRoot) });
      return true;
    }
    if (url.pathname === "/api/file") {
      const publicPath = url.searchParams.get("path") || "";
      const filePath = this.resolveProjectDocument(publicPath);
      sendJson(response, await localPayload(filePath, "project", this.libraryRoot, publicPath));
      return true;
    }
    if (url.pathname === "/api/open") {
      sendJson(response, await this.openSource(url.searchParams.get("source") || ""));
      return true;
    }
    if (url.pathname === "/api/meta") {
      const source = url.searchParams.get("source") || "";
      if (/^https?:\/\//i.test(source)) {
        sendJson(response, { source, remote: true });
      } else {
        const { filePath } = this.sourceToLocalPath(source);
        const stat = await fsp.stat(filePath);
        sendJson(response, { source, modifiedNs: Math.round(stat.mtimeMs * 1_000_000), size: stat.size });
      }
      return true;
    }
    if (url.pathname === "/api/media") {
      const filePath = this.resolveMedia(url.searchParams.get("path") || "", url.searchParams.get("from") || "");
      const stat = await fsp.stat(filePath);
      if (!stat.isFile() || stat.size > MAX_MEDIA_BYTES) throw new Error("Media is unavailable or exceeds the 32 MB limit");
      response.writeHead(200, {
        "Content-Type": contentType(filePath),
        "Content-Length": stat.size,
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      });
      fs.createReadStream(filePath).pipe(response);
      return true;
    }
    return false;
  }

  async serveStatic(response, pathname) {
    const requested = pathname === "/" ? "/index.html" : pathname;
    const filePath = path.resolve(this.rendererRoot, `.${decodeURIComponent(requested)}`);
    if (!isInside(this.rendererRoot, filePath)) throw new Error("Static path is outside the application");
    const stat = await fsp.stat(filePath);
    if (!stat.isFile()) throw new Error("Static file not found");
    response.writeHead(200, {
      "Content-Type": contentType(filePath),
      "Content-Length": stat.size,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    fs.createReadStream(filePath).pipe(response);
  }

  async route(request, response) {
    const url = new URL(request.url, "http://127.0.0.1");
    try {
      if (url.pathname.startsWith("/api/")) {
        if (!await this.handleApi(request, response, url)) sendError(response, new Error("API endpoint not found"), 404);
        return;
      }
      await this.serveStatic(response, url.pathname);
    } catch (error) {
      sendError(response, error, 404);
    }
  }

  listen(port = 0) {
    if (this.server) throw new Error("Reader service is already running");
    this.server = http.createServer((request, response) => this.route(request, response));
    return new Promise((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(port, "127.0.0.1", () => {
        this.port = this.server.address().port;
        resolve(this.port);
      });
    });
  }

  close() {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }
      const server = this.server;
      server.close(() => {
        this.server = null;
        this.port = null;
        resolve();
      });
      server.closeAllConnections?.();
    });
  }
}

module.exports = {
  APP_NAME,
  APP_VERSION,
  DOCUMENT_EXTENSIONS,
  LocalReaderService,
  scanDocuments,
};

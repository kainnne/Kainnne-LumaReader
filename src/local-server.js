"use strict";

const http = require("node:http");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { promisify } = require("node:util");
const { fileURLToPath, pathToFileURL } = require("node:url");
const { inflateRaw } = require("node:zlib");
const {
  DOCUMENT_EXTENSIONS,
  DOCUMENT_TYPES,
  EXPLICITLY_UNSUPPORTED_EXTENSIONS,
  LIMITS,
  getDocumentType,
  isExplicitlyUnsupported,
  isSupportedDocument,
  publicTypeRecord,
} = require("./document-types");
const { version: APP_VERSION } = require("../package.json");

const APP_NAME = "Kainnne LumaReader";
const MAX_MEDIA_BYTES = 32 * 1024 * 1024;
const MAX_XLSX_CENTRAL_DIRECTORY_BYTES = 16 * 1024 * 1024;
const inflateRawAsync = promisify(inflateRaw);
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
const DEFAULT_SCAN_LIMITS = Object.freeze({
  maxDirectories: 2_000,
  maxFiles: 20_000,
  pathResolutionTimeoutMs: 1_200,
  readDirectoryTimeoutMs: 1_200,
  statFileTimeoutMs: 1_200,
});

const STATIC_MIME_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".mjs", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".wasm", "application/wasm"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gif", "image/gif"],
  [".webp", "image/webp"],
  [".avif", "image/avif"],
  [".bmp", "image/bmp"],
  [".svg", "image/svg+xml"],
  [".mp3", "audio/mpeg"],
  [".wav", "audio/wav"],
  [".ogg", "audio/ogg"],
  [".mp4", "video/mp4"],
  [".webm", "video/webm"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".ttf", "font/ttf"],
  [".otf", "font/otf"],
  [".icns", "image/icns"],
]);

const PROJECT_ROOT_MARKERS = [".git", "package.json", ".lumareader.json"];

const INCLUDE_PATTERNS = [
  /^\s*!INCLUDE\s+["']([^"']+)["']\s*$/i,
  /^\s*\{\{\s*include\s*:\s*([^}]+?)\s*\}\}\s*$/i,
];

class HttpError extends Error {
  constructor(message, status = 400, code = "BAD_REQUEST") {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function isDocument(filePath) {
  return isSupportedDocument(filePath);
}

function staticContentType(filePath) {
  return STATIC_MIME_TYPES.get(path.extname(filePath).toLowerCase()) || "application/octet-stream";
}

function mediaContentType(filePath) {
  const mime = staticContentType(filePath);
  if (!/^(?:image|audio|video)\//.test(mime)) {
    throw new HttpError("Unsupported media type", 415, "UNSUPPORTED_MEDIA_TYPE");
  }
  return mime;
}

function cleanMediaReference(rawPath) {
  let requested = String(rawPath || "").trim().replace(/^<|>$/g, "");
  requested = requested.split(/[?#]/, 1)[0];
  try {
    requested = decodeURIComponent(requested);
  } catch {
    throw new HttpError("Media path is malformed", 400, "INVALID_MEDIA_PATH");
  }
  if (!requested || requested.includes("\0")) throw new HttpError("Media path is unavailable", 404, "MEDIA_NOT_FOUND");
  return requested;
}

function nearestProjectRoot(sourceFile, boundary) {
  let directory = path.dirname(sourceFile);
  while (isInside(boundary, directory)) {
    if (PROJECT_ROOT_MARKERS.some((marker) => fs.existsSync(path.join(directory, marker)))) return directory;
    if (directory === boundary) break;
    const parent = path.dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  return boundary;
}

function documentContentType(type) {
  return type.encoding ? `${type.mime}; charset=${type.encoding}` : type.mime;
}

function requireDocumentType(filePath) {
  const type = getDocumentType(filePath);
  if (type) return type;
  if (isExplicitlyUnsupported(filePath)) {
    throw new HttpError(`Unsupported document type: ${path.extname(filePath).toLowerCase()}`, 415, "UNSUPPORTED_DOCUMENT_TYPE");
  }
  throw new HttpError("Unsupported document type", 415, "UNSUPPORTED_DOCUMENT_TYPE");
}

function decodeUtf8(bytes) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new HttpError("Document is not valid UTF-8 text", 422, "TEXT_DECODING_FAILED");
  }
}

function typeFields(type) {
  return {
    ext: type.ext,
    extension: type.extension,
    kind: type.kind,
    category: type.category,
    mime: type.mime,
    binary: type.binary,
    encoding: type.encoding,
    capabilities: { ...type.capabilities },
    experimental: type.experimental,
    limits: {
      maxBytes: type.maxBytes,
      ...(type.kind === "xlsx" ? {
        maxArchiveEntries: LIMITS.xlsxArchiveEntries,
        maxUncompressedBytes: LIMITS.xlsxUncompressedBytes,
        maxEntryUncompressedBytes: LIMITS.xlsxEntryUncompressedBytes,
        maxCompressionRatio: LIMITS.xlsxCompressionRatio,
        maxSheets: LIMITS.xlsxSheets,
        maxRowsPerSheet: LIMITS.xlsxRowsPerSheet,
        maxColumnsPerSheet: LIMITS.xlsxColumnsPerSheet,
        maxCells: LIMITS.xlsxCells,
      } : {}),
    },
    ...(type.syntax ? { syntax: type.syntax } : {}),
    ...(type.delimiter ? { delimiter: type.delimiter } : {}),
  };
}

function publicFileRecord(root, filePath, stat) {
  const relative = path.relative(root, filePath).split(path.sep).join("/");
  const parts = relative.split("/");
  const type = requireDocumentType(filePath);
  return {
    path: relative,
    name: path.basename(filePath),
    folder: parts.length > 1 ? parts.slice(0, -1).join("/") : "",
    project: parts.length > 1 ? parts[0] : path.basename(root),
    modified: new Date(stat.mtimeMs).toISOString(),
    modifiedNs: Math.round(stat.mtimeMs * 1_000_000),
    size: stat.size,
    previewable: stat.size <= type.maxBytes,
    ...typeFields(type),
  };
}

async function readDirectoryWithin(directory, timeoutMs) {
  let timeout;
  try {
    return await Promise.race([
      fsp.readdir(directory, { withFileTypes: true }).catch(() => []),
      new Promise((resolve) => {
        timeout = setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

async function resolvePathWithin(candidate, timeoutMs) {
  let timeout;
  try {
    return await Promise.race([
      fsp.realpath(candidate).catch(() => null),
      new Promise((resolve) => {
        timeout = setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

async function statFileWithin(filePath, timeoutMs) {
  let timeout;
  try {
    return await Promise.race([
      fsp.stat(filePath).catch(() => null),
      new Promise((resolve) => {
        timeout = setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

async function scanDocuments(root, options = {}) {
  if (!root) return [];
  const limits = { ...DEFAULT_SCAN_LIMITS, ...options };
  const resolvedRoot = await resolvePathWithin(root, limits.pathResolutionTimeoutMs);
  if (!resolvedRoot) throw new HttpError("The selected folder could not be scanned", 408, "LIBRARY_SCAN_TIMEOUT");
  const records = [];
  const directories = [resolvedRoot];
  let directoryIndex = 0;

  while (
    directoryIndex < directories.length
    && directoryIndex < limits.maxDirectories
    && records.length < limits.maxFiles
  ) {
    const directory = directories[directoryIndex++];
    const entries = await readDirectoryWithin(directory, limits.readDirectoryTimeoutMs);
    if (!entries) continue;
    const files = [];
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.isSymbolicLink()) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (
          !IGNORED_DIRECTORIES.has(entry.name)
          && !entry.name.endsWith(".app")
          && directories.length < limits.maxDirectories
        ) directories.push(absolute);
        continue;
      }
      if (!entry.isFile() || !isDocument(absolute)) continue;
      files.push(absolute);
      if (records.length + files.length >= limits.maxFiles) break;
    }
    await Promise.all(files.map(async (absolute) => {
      try {
        const stat = await statFileWithin(absolute, limits.statFileTimeoutMs);
        if (!stat) return;
        records.push(publicFileRecord(resolvedRoot, absolute, stat));
      } catch {
        // A disappearing file should not prevent the rest of the library from loading.
      }
    }));
  }
  return records.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: "base" }));
}

async function statDocument(filePath) {
  const type = requireDocumentType(filePath);
  let stat;
  try {
    stat = await fsp.stat(filePath);
  } catch {
    throw new HttpError("Document not found", 404, "DOCUMENT_NOT_FOUND");
  }
  if (!stat.isFile()) throw new HttpError("Document not found", 404, "DOCUMENT_NOT_FOUND");
  if (stat.size > type.maxBytes) {
    const limitMb = Math.round(type.maxBytes / (1024 * 1024));
    throw new HttpError(`Document exceeds the ${limitMb} MB preview limit`, 413, "DOCUMENT_TOO_LARGE");
  }
  return { stat, type };
}

async function readDocument(filePath) {
  const { stat, type } = await statDocument(filePath);
  if (type.binary) throw new HttpError("Binary documents must use the content endpoint", 415, "BINARY_DOCUMENT");
  return { text: decodeUtf8(await fsp.readFile(filePath)), stat, type };
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
    let candidate = path.resolve(baseDirectory, includePath);
    try {
      candidate = await fsp.realpath(candidate);
    } catch {
      output.push(`> [!WARNING]\n> Include unavailable: \`${includePath}\``);
      continue;
    }
    if ((boundary && !isInside(boundary, candidate)) || seen.has(candidate)) {
      output.push(`> [!WARNING]\n> Include blocked: \`${includePath}\``);
      continue;
    }
    try {
      const included = await readDocument(candidate);
      if (included.type.kind !== "markdown") throw new Error("Includes are Markdown-only");
      output.push(await expandIncludes(included.text, path.dirname(candidate), boundary, new Set([...seen, candidate]), depth + 1));
    } catch {
      output.push(`> [!WARNING]\n> Include unavailable: \`${includePath}\``);
    }
  }
  return output.join("\n");
}

async function inspectXlsxArchive(filePath, stat = null) {
  const fileStat = stat || await fsp.stat(filePath);
  if (fileStat.size < 22) throw new HttpError("Malformed XLSX archive", 415, "INVALID_XLSX");
  const handle = await fsp.open(filePath, "r");
  try {
    const tailLength = Math.min(fileStat.size, 65_557);
    const tail = Buffer.allocUnsafe(tailLength);
    await handle.read(tail, 0, tailLength, fileStat.size - tailLength);
    let eocd = -1;
    for (let offset = tail.length - 22; offset >= 0; offset -= 1) {
      if (
        tail.readUInt32LE(offset) === 0x06054b50
        && offset + 22 + tail.readUInt16LE(offset + 20) === tail.length
      ) {
        eocd = offset;
        break;
      }
    }
    if (eocd < 0) throw new HttpError("Malformed XLSX archive", 415, "INVALID_XLSX");

    const diskNumber = tail.readUInt16LE(eocd + 4);
    const centralDisk = tail.readUInt16LE(eocd + 6);
    const entriesOnDisk = tail.readUInt16LE(eocd + 8);
    const entryCount = tail.readUInt16LE(eocd + 10);
    const centralSize = tail.readUInt32LE(eocd + 12);
    const centralOffset = tail.readUInt32LE(eocd + 16);
    const zip64 = entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff;
    if (zip64) throw new HttpError("ZIP64 XLSX workbooks are not supported", 415, "XLSX_ZIP64_UNSUPPORTED");
    if (diskNumber !== 0 || centralDisk !== 0 || entriesOnDisk !== entryCount) throw new HttpError("Multi-part XLSX archives are not supported", 415, "INVALID_XLSX");
    if (entryCount > LIMITS.xlsxArchiveEntries) throw new HttpError("XLSX contains too many archive entries", 413, "XLSX_LIMIT_EXCEEDED");
    const eocdAbsoluteOffset = fileStat.size - tailLength + eocd;
    if (
      centralSize > MAX_XLSX_CENTRAL_DIRECTORY_BYTES
      || centralOffset + centralSize !== eocdAbsoluteOffset
    ) {
      throw new HttpError("Malformed or oversized XLSX directory", 415, "INVALID_XLSX");
    }

    const central = Buffer.allocUnsafe(centralSize);
    await handle.read(central, 0, centralSize, centralOffset);
    let cursor = 0;
    let parsedEntries = 0;
    let compressedBytes = 0;
    let uncompressedBytes = 0;
    let maxCompressionRatio = 0;
    let encrypted = false;
    let unsafePath = false;
    let hasWorkbook = false;
    let hasContentTypes = false;
    let hasMacros = false;
    let hasExternalLinks = false;
    let unsupportedCompression = false;
    const archiveEntries = [];

    while (cursor < central.length && parsedEntries < entryCount) {
      if (cursor + 46 > central.length || central.readUInt32LE(cursor) !== 0x02014b50) {
        throw new HttpError("Malformed XLSX central directory", 415, "INVALID_XLSX");
      }
      const flags = central.readUInt16LE(cursor + 8);
      const compression = central.readUInt16LE(cursor + 10);
      const compressed = central.readUInt32LE(cursor + 20);
      const uncompressed = central.readUInt32LE(cursor + 24);
      const nameLength = central.readUInt16LE(cursor + 28);
      const extraLength = central.readUInt16LE(cursor + 30);
      const commentLength = central.readUInt16LE(cursor + 32);
      const localOffset = central.readUInt32LE(cursor + 42);
      const end = cursor + 46 + nameLength + extraLength + commentLength;
      if (end > central.length) throw new HttpError("Malformed XLSX central directory", 415, "INVALID_XLSX");
      const entryName = central.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8").replace(/\\/g, "/");
      const lowerEntryName = entryName.toLowerCase();
      const segments = entryName.split("/");
      encrypted ||= Boolean(flags & 0x0001);
      unsafePath ||= entryName.startsWith("/") || /^[a-z]:/i.test(entryName) || segments.includes("..");
      hasWorkbook ||= entryName === "xl/workbook.xml";
      hasContentTypes ||= entryName === "[Content_Types].xml";
      hasMacros ||= lowerEntryName === "xl/vbaproject.bin";
      hasExternalLinks ||= lowerEntryName.startsWith("xl/externallinks/");
      unsupportedCompression ||= ![0, 8].includes(compression);
      compressedBytes += compressed;
      uncompressedBytes += uncompressed;
      const ratio = compressed === 0 ? (uncompressed === 0 ? 0 : Infinity) : uncompressed / compressed;
      maxCompressionRatio = Math.max(maxCompressionRatio, ratio);
      archiveEntries.push({ entryName, compression, compressed, uncompressed, localOffset });
      parsedEntries += 1;
      cursor = end;
    }

    if (parsedEntries !== entryCount || cursor !== central.length) throw new HttpError("Malformed XLSX central directory", 415, "INVALID_XLSX");
    if (encrypted) throw new HttpError("Encrypted XLSX workbooks are not supported", 415, "XLSX_ENCRYPTED");
    if (unsupportedCompression) throw new HttpError("Unsupported XLSX compression method", 415, "INVALID_XLSX");
    if (unsafePath) throw new HttpError("Unsafe paths were found inside the XLSX archive", 415, "XLSX_UNSAFE_PATH");
    if (hasMacros) throw new HttpError("Macro-bearing workbooks are not supported", 415, "XLSX_MACROS_UNSUPPORTED");
    if (!hasWorkbook || !hasContentTypes) throw new HttpError("The file is not a valid XLSX workbook", 415, "INVALID_XLSX");
    if (uncompressedBytes > LIMITS.xlsxUncompressedBytes || maxCompressionRatio > LIMITS.xlsxCompressionRatio) {
      throw new HttpError("XLSX decompression limits exceeded", 413, "XLSX_LIMIT_EXCEEDED");
    }

    for (const entry of archiveEntries) {
      if (entry.uncompressed > LIMITS.xlsxEntryUncompressedBytes) {
        throw new HttpError("An XLSX archive entry exceeds the decompression limit", 413, "XLSX_LIMIT_EXCEEDED");
      }
      if (entry.localOffset + 30 > centralOffset) throw new HttpError("Malformed XLSX local header", 415, "INVALID_XLSX");
      const localHeader = Buffer.allocUnsafe(30);
      const localHeaderRead = await handle.read(localHeader, 0, localHeader.length, entry.localOffset);
      if (localHeaderRead.bytesRead !== localHeader.length || localHeader.readUInt32LE(0) !== 0x04034b50) {
        throw new HttpError("Malformed XLSX local header", 415, "INVALID_XLSX");
      }
      const localCompression = localHeader.readUInt16LE(8);
      const localNameLength = localHeader.readUInt16LE(26);
      const localExtraLength = localHeader.readUInt16LE(28);
      const dataOffset = entry.localOffset + 30 + localNameLength + localExtraLength;
      if (localCompression !== entry.compression || dataOffset + entry.compressed > centralOffset) {
        throw new HttpError("Malformed XLSX archive entry", 415, "INVALID_XLSX");
      }
      const localName = Buffer.allocUnsafe(localNameLength);
      const localNameRead = await handle.read(localName, 0, localNameLength, entry.localOffset + 30);
      if (localNameRead.bytesRead !== localNameLength || localName.toString("utf8").replace(/\\/g, "/") !== entry.entryName) {
        throw new HttpError("Mismatched XLSX archive entry", 415, "INVALID_XLSX");
      }
      if (entry.compression === 0) {
        if (entry.compressed !== entry.uncompressed) throw new HttpError("Invalid stored XLSX entry size", 415, "INVALID_XLSX");
        continue;
      }
      const compressedData = Buffer.allocUnsafe(entry.compressed);
      const compressedRead = await handle.read(compressedData, 0, entry.compressed, dataOffset);
      if (compressedRead.bytesRead !== entry.compressed) throw new HttpError("Truncated XLSX archive entry", 415, "INVALID_XLSX");
      let output;
      try {
        output = await inflateRawAsync(compressedData, {
          maxOutputLength: Math.min(LIMITS.xlsxEntryUncompressedBytes, Math.max(1, entry.uncompressed + 1)),
        });
      } catch {
        throw new HttpError("Invalid or oversized XLSX compressed data", 415, "INVALID_XLSX");
      }
      if (output.length !== entry.uncompressed) throw new HttpError("Mismatched XLSX decompressed size", 415, "INVALID_XLSX");
    }

    return {
      valid: true,
      container: "zip",
      zip64: false,
      entryCount,
      compressedBytes,
      uncompressedBytes,
      maxCompressionRatio: Number(maxCompressionRatio.toFixed(2)),
      hasWorkbook,
      hasExternalLinks,
      hasMacros,
      encrypted,
    };
  } finally {
    await handle.close();
  }
}

async function inspectBinaryDocument(filePath, type, stat) {
  if (!type.binary) return null;
  if (type.kind === "xlsx") return inspectXlsxArchive(filePath, stat);
  const length = Math.min(stat.size, 1024);
  const handle = await fsp.open(filePath, "r");
  try {
    const head = Buffer.alloc(length);
    await handle.read(head, 0, length, 0);
    let valid = true;
    if (type.kind === "pdf") valid = head.includes(Buffer.from("%PDF-"));
    if (type.extension === ".png") valid = head.length >= 8 && head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if ([".jpg", ".jpeg"].includes(type.extension)) valid = head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    if (type.extension === ".gif") valid = head.subarray(0, 6).toString("ascii") === "GIF87a" || head.subarray(0, 6).toString("ascii") === "GIF89a";
    if (type.extension === ".webp") valid = head.subarray(0, 4).toString("ascii") === "RIFF" && head.subarray(8, 12).toString("ascii") === "WEBP";
    if (!valid) throw new HttpError(`File content does not match ${type.extension}`, 415, "CONTENT_TYPE_MISMATCH");
    return { valid: true, signature: type.kind === "image" ? type.extension.slice(1) : type.kind };
  } finally {
    await handle.close();
  }
}

function contentUrlFor(sourceType, publicPath, filePath) {
  if (sourceType === "project") return `/api/content?path=${encodeURIComponent(publicPath)}`;
  return `/api/content?source=${encodeURIComponent(pathToFileURL(filePath).href)}`;
}

async function localPayload(filePath, sourceType, root, publicPath = null, inspect = inspectBinaryDocument) {
  const { stat, type } = await statDocument(filePath);
  const common = {
    path: sourceType === "project" ? publicPath : pathToFileURL(filePath).href,
    name: path.basename(filePath),
    sourceType,
    base: `${pathToFileURL(path.dirname(filePath)).href}/`,
    modified: new Date(stat.mtimeMs).toISOString(),
    modifiedNs: Math.round(stat.mtimeMs * 1_000_000),
    size: stat.size,
    ...typeFields(type),
  };
  if (type.binary) {
    const preflight = await inspect(filePath, type, stat);
    return {
      ...common,
      content: {
        mode: "binary",
        url: contentUrlFor(sourceType, publicPath, filePath),
        range: type.kind === "pdf",
      },
      contentUrl: contentUrlFor(sourceType, publicPath, filePath),
      preflight,
    };
  }
  const text = decodeUtf8(await fsp.readFile(filePath));
  const boundary = sourceType === "project" ? root : path.dirname(filePath);
  return {
    ...common,
    content: { mode: "text", encoding: "utf-8" },
    text,
    renderText: type.kind === "markdown"
      ? await expandIncludes(text, path.dirname(filePath), boundary, new Set([filePath]))
      : text,
  };
}

async function remotePayload(source) {
  const url = new URL(source);
  if (!["http:", "https:"].includes(url.protocol)) throw new HttpError("Only HTTP and HTTPS URLs are supported", 400, "UNSUPPORTED_PROTOCOL");
  const pathname = url.pathname || "remote.md";
  const type = getDocumentType(pathname) || (path.extname(pathname) ? null : getDocumentType(".md"));
  if (!type) throw new HttpError("Unsupported remote document type", 415, "UNSUPPORTED_DOCUMENT_TYPE");
  if (type.binary) throw new HttpError("Remote binary documents are not supported; open a local copy instead", 415, "REMOTE_BINARY_UNSUPPORTED");
  const response = await fetch(url, {
    headers: { "User-Agent": `${APP_NAME}/${APP_VERSION}` },
    redirect: "follow",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new HttpError(`Remote document returned HTTP ${response.status}`, 502, "REMOTE_FETCH_FAILED");
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > type.maxBytes) throw new HttpError("Remote document exceeds its preview limit", 413, "DOCUMENT_TOO_LARGE");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > type.maxBytes) throw new HttpError("Remote document exceeds its preview limit", 413, "DOCUMENT_TOO_LARGE");
  const finalUrl = response.url || source;
  const text = decodeUtf8(bytes);
  return {
    path: finalUrl,
    name: path.basename(new URL(finalUrl).pathname) || `remote${type.extension}`,
    sourceType: "remote",
    base: new URL("./", finalUrl).href,
    content: { mode: "text", encoding: "utf-8" },
    text,
    renderText: text,
    modified: null,
    modifiedNs: null,
    size: bytes.length,
    ...typeFields(type),
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

function sendError(response, error, status = null) {
  const responseStatus = status || error.status || 404;
  sendJson(response, {
    error: error.message || String(error),
    type: error.name || "Error",
    code: error.code || "REQUEST_FAILED",
  }, responseStatus);
}

function parseRange(value, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(String(value || "").trim());
  if (!match || (!match[1] && !match[2]) || size <= 0) return null;
  let start;
  let end;
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start) return null;
    end = Math.min(end, size - 1);
  }
  if (start >= size) return null;
  return { start, end };
}

function streamFile(request, response, filePath, stat, mime, allowRange = false) {
  const rangeHeader = allowRange ? request.headers.range : null;
  const headers = {
    "Content-Type": mime,
    "Cache-Control": "no-cache",
    "X-Content-Type-Options": "nosniff",
    ...(allowRange ? { "Accept-Ranges": "bytes" } : {}),
  };
  let start = 0;
  let end = stat.size - 1;
  let status = 200;
  if (rangeHeader) {
    const range = parseRange(rangeHeader, stat.size);
    if (!range) {
      response.writeHead(416, { ...headers, "Content-Range": `bytes */${stat.size}`, "Content-Length": 0 });
      response.end();
      return;
    }
    ({ start, end } = range);
    status = 206;
    headers["Content-Range"] = `bytes ${start}-${end}/${stat.size}`;
  }
  headers["Content-Length"] = Math.max(0, end - start + 1);
  response.writeHead(status, headers);
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  fs.createReadStream(filePath, { start, end }).pipe(response);
}

function publicDocumentTypes() {
  return [...DOCUMENT_TYPES.values()].map((type) => publicTypeRecord(type.extension));
}

class LocalReaderService {
  constructor({ rendererRoot, libraryRoot = null }) {
    this.rendererRoot = fs.realpathSync(path.resolve(rendererRoot));
    this.libraryRoot = null;
    this.server = null;
    this.port = null;
    this.preflightCache = new Map();
    if (libraryRoot) this.setLibraryRoot(libraryRoot);
  }

  setLibraryRoot(directory) {
    if (!directory) {
      this.libraryRoot = null;
      this.preflightCache.clear();
      return null;
    }
    const resolved = fs.realpathSync(path.resolve(directory));
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) throw new Error("The selected library is not a directory");
    this.libraryRoot = resolved;
    this.preflightCache.clear();
    return resolved;
  }

  getLibraryRoot() {
    return this.libraryRoot;
  }

  async preflightBinary(filePath, type, stat) {
    if (!type.binary) return null;
    const key = `${stat.size}:${stat.mtimeMs}`;
    const cached = this.preflightCache.get(filePath);
    if (cached?.key === key) return cached.promise;
    if (this.preflightCache.size >= 128) this.preflightCache.clear();
    const promise = inspectBinaryDocument(filePath, type, stat);
    this.preflightCache.set(filePath, { key, promise });
    try {
      return await promise;
    } catch (error) {
      if (this.preflightCache.get(filePath)?.promise === promise) this.preflightCache.delete(filePath);
      throw error;
    }
  }

  resolveProjectDocument(rawPath) {
    if (!this.libraryRoot) throw new HttpError("Choose a library folder first", 400, "LIBRARY_NOT_SELECTED");
    const requested = String(rawPath || "").replace(/^[/\\]+/, "");
    const candidate = path.resolve(this.libraryRoot, requested);
    if (!isInside(this.libraryRoot, candidate)) throw new HttpError("Document is outside the selected library", 403, "PATH_OUTSIDE_LIBRARY");
    requireDocumentType(candidate);
    let realCandidate;
    try {
      realCandidate = fs.realpathSync(candidate);
    } catch {
      throw new HttpError("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }
    if (!isInside(this.libraryRoot, realCandidate)) throw new HttpError("Document is outside the selected library", 403, "PATH_OUTSIDE_LIBRARY");
    return realCandidate;
  }

  sourceToLocalPath(source) {
    const clean = String(source || "").trim();
    if (clean.startsWith("file://")) return { filePath: fs.realpathSync(fileURLToPath(clean)), sourceType: "external" };
    if (path.isAbsolute(clean)) return { filePath: fs.realpathSync(path.resolve(clean)), sourceType: "external" };
    return { filePath: this.resolveProjectDocument(clean), sourceType: "project" };
  }

  async openSource(source) {
    const clean = String(source || "").trim();
    if (/^https?:\/\//i.test(clean)) return remotePayload(clean);
    const { filePath, sourceType } = this.sourceToLocalPath(clean);
    const publicPath = sourceType === "project" ? path.relative(this.libraryRoot, filePath).split(path.sep).join("/") : null;
    return localPayload(filePath, sourceType, this.libraryRoot, publicPath, (target, type, stat) => this.preflightBinary(target, type, stat));
  }

  async saveMarkdownDocument(rawPath, text, expectedModifiedNs = null) {
    const filePath = this.resolveProjectDocument(rawPath);
    const publicPath = path.relative(this.libraryRoot, filePath).split(path.sep).join("/");
    const { stat, type } = await statDocument(filePath);
    if (type.kind !== "markdown") {
      throw new HttpError("Only Markdown documents can be edited", 415, "DOCUMENT_READ_ONLY");
    }
    if (typeof text !== "string") {
      throw new HttpError("Markdown content must be text", 400, "INVALID_DOCUMENT_CONTENT");
    }
    if (Buffer.byteLength(text, "utf8") > type.maxBytes) {
      const limitMb = Math.round(type.maxBytes / (1024 * 1024));
      throw new HttpError(`Document exceeds the ${limitMb} MB edit limit`, 413, "DOCUMENT_TOO_LARGE");
    }
    if (expectedModifiedNs !== null && expectedModifiedNs !== undefined) {
      const expected = Number(expectedModifiedNs);
      if (!Number.isFinite(expected)) {
        throw new HttpError("The document version is invalid", 400, "INVALID_DOCUMENT_VERSION");
      }
      const current = Math.round(stat.mtimeMs * 1_000_000);
      if (current !== expected) {
        throw new HttpError("This document changed outside LumaReader. Reopen it before saving.", 409, "DOCUMENT_CHANGED");
      }
    }
    try {
      await fsp.writeFile(filePath, text, { encoding: "utf8", flag: "w" });
    } catch (error) {
      if (["EACCES", "EPERM", "EROFS"].includes(error.code)) {
        throw new HttpError("This document is read-only or LumaReader does not have permission to save it.", 403, "DOCUMENT_NOT_WRITABLE");
      }
      throw error;
    }
    return localPayload(filePath, "project", this.libraryRoot, publicPath, (target, targetType, targetStat) => this.preflightBinary(target, targetType, targetStat));
  }

  resolveMedia(rawPath, fromSource) {
    const { filePath: sourceFile, sourceType } = this.sourceToLocalPath(fromSource);
    const requested = cleanMediaReference(rawPath);
    const boundary = sourceType === "project" ? this.libraryRoot : path.dirname(sourceFile);
    const rootRelative = /^[/\\]/.test(requested);
    const cleanRelative = requested.replace(/^[/\\]+/, "");
    const candidates = [];
    if (rootRelative && sourceType === "project") {
      const projectRoot = nearestProjectRoot(sourceFile, boundary);
      for (const base of [projectRoot, path.join(projectRoot, "public"), path.join(projectRoot, "static"), boundary, path.join(boundary, "public"), path.join(boundary, "static")]) {
        candidates.push(path.resolve(base, cleanRelative));
      }
    } else if (rootRelative) {
      candidates.push(path.resolve(requested));
    } else {
      candidates.push(path.resolve(path.dirname(sourceFile), requested));
    }

    let outside = false;
    for (const candidate of [...new Set(candidates)]) {
      if (!isInside(boundary, candidate)) {
        outside = true;
        continue;
      }
      try {
        const realCandidate = fs.realpathSync(candidate);
        if (!isInside(boundary, realCandidate)) {
          outside = true;
          continue;
        }
        const stat = fs.statSync(realCandidate);
        if (stat.isFile()) return realCandidate;
      } catch {
        // Try the next safe project asset root.
      }
    }
    if (outside && candidates.every((candidate) => !isInside(boundary, candidate))) {
      throw new HttpError("Media is outside the allowed document folder", 403, "PATH_OUTSIDE_LIBRARY");
    }
    throw new HttpError("Media is unavailable", 404, "MEDIA_NOT_FOUND");
  }

  resolveContent(url) {
    if (url.searchParams.has("path")) return this.resolveProjectDocument(url.searchParams.get("path") || "");
    const source = url.searchParams.get("source") || "";
    if (/^https?:\/\//i.test(source)) throw new HttpError("Remote binary content is not supported", 415, "REMOTE_BINARY_UNSUPPORTED");
    return this.sourceToLocalPath(source).filePath;
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
    if (url.pathname === "/api/types") {
      sendJson(response, {
        types: publicDocumentTypes(),
        extensions: [...DOCUMENT_EXTENSIONS].sort(),
        explicitlyUnsupported: [...EXPLICITLY_UNSUPPORTED_EXTENSIONS].sort(),
      });
      return true;
    }
    if (url.pathname === "/api/files") {
      sendJson(response, {
        root: this.libraryRoot,
        extensions: [...DOCUMENT_EXTENSIONS].sort(),
        types: publicDocumentTypes(),
        explicitlyUnsupported: [...EXPLICITLY_UNSUPPORTED_EXTENSIONS].sort(),
        files: await scanDocuments(this.libraryRoot),
      });
      return true;
    }
    if (url.pathname === "/api/file") {
      const publicPath = url.searchParams.get("path") || "";
      const filePath = this.resolveProjectDocument(publicPath);
      sendJson(response, await localPayload(
        filePath,
        "project",
        this.libraryRoot,
        publicPath,
        (target, type, stat) => this.preflightBinary(target, type, stat),
      ));
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
        const { stat, type } = await statDocument(filePath);
        sendJson(response, {
          source,
          modifiedNs: Math.round(stat.mtimeMs * 1_000_000),
          size: stat.size,
          ...typeFields(type),
          ...(type.binary ? { preflight: await this.preflightBinary(filePath, type, stat) } : {}),
        });
      }
      return true;
    }
    if (url.pathname === "/api/content") {
      const filePath = this.resolveContent(url);
      const { stat, type } = await statDocument(filePath);
      if (!type.binary) throw new HttpError("Text documents must use the document endpoint", 415, "TEXT_DOCUMENT");
      await this.preflightBinary(filePath, type, stat);
      streamFile(request, response, filePath, stat, documentContentType(type), type.kind === "pdf");
      return true;
    }
    if (url.pathname === "/api/media") {
      const filePath = this.resolveMedia(url.searchParams.get("path") || "", url.searchParams.get("from") || "");
      const stat = await fsp.stat(filePath);
      if (!stat.isFile() || stat.size > MAX_MEDIA_BYTES) throw new HttpError("Media is unavailable or exceeds the 32 MB limit", 413, "MEDIA_TOO_LARGE");
      streamFile(request, response, filePath, stat, mediaContentType(filePath), false);
      return true;
    }
    return false;
  }

  async serveStatic(request, response, pathname) {
    const requested = pathname === "/" ? "/index.html" : pathname;
    const candidate = path.resolve(this.rendererRoot, `.${decodeURIComponent(requested)}`);
    if (!isInside(this.rendererRoot, candidate)) throw new HttpError("Static path is outside the application", 403, "PATH_OUTSIDE_RENDERER");
    let filePath;
    try {
      filePath = await fsp.realpath(candidate);
    } catch {
      throw new HttpError("Static file not found", 404, "STATIC_NOT_FOUND");
    }
    if (!isInside(this.rendererRoot, filePath)) throw new HttpError("Static path is outside the application", 403, "PATH_OUTSIDE_RENDERER");
    const stat = await fsp.stat(filePath);
    if (!stat.isFile()) throw new HttpError("Static file not found", 404, "STATIC_NOT_FOUND");
    streamFile(request, response, filePath, stat, staticContentType(filePath), false);
  }

  async route(request, response) {
    try {
      if (!["GET", "HEAD"].includes(request.method || "GET")) throw new HttpError("Method not allowed", 405, "METHOD_NOT_ALLOWED");
      const host = String(request.headers.host || "127.0.0.1").split(":")[0].toLowerCase();
      if (!["127.0.0.1", "localhost"].includes(host)) throw new HttpError("Host is not allowed", 403, "HOST_NOT_ALLOWED");
      const url = new URL(request.url, "http://127.0.0.1");
      if (url.pathname.startsWith("/api/")) {
        if (!await this.handleApi(request, response, url)) sendError(response, new HttpError("API endpoint not found", 404, "API_NOT_FOUND"));
        return;
      }
      await this.serveStatic(request, response, url.pathname);
    } catch (error) {
      sendError(response, error);
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
  HttpError,
  LocalReaderService,
  inspectXlsxArchive,
  parseRange,
  scanDocuments,
};

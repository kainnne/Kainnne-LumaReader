"use strict";

const path = require("node:path");

const MB = 1024 * 1024;

const LIMITS = Object.freeze({
  markdownBytes: 8 * MB,
  textBytes: 16 * MB,
  codeBytes: MB,
  // Kept for the dormant archive validator; no binary format is exposed.
  xlsxArchiveEntries: 10_000,
  xlsxUncompressedBytes: 512 * MB,
  xlsxEntryUncompressedBytes: 128 * MB,
  xlsxCompressionRatio: 200,
  xlsxSheets: 256,
  xlsxRowsPerSheet: 200_000,
  xlsxColumnsPerSheet: 16_384,
  xlsxCells: 2_000_000,
});

const CAPABILITIES = Object.freeze({
  markdown: Object.freeze({ search: true, paged: true, outline: true, media: true, source: true, edit: true, wrap: true }),
  code: Object.freeze({search:true,source:false,edit:true,wrap:true,monospaced:true}),
  text: Object.freeze({ search: true, paged: true, source: true, wrap: true }),
  log: Object.freeze({ search: true, paged: true, source: true, wrap: true, monospaced: true }),
});

function record(extension, kind, category, mime, binary, maxBytes, capabilities, extra = {}) {
  return Object.freeze({
    extension,
    ext: extension,
    kind,
    category,
    mime,
    binary,
    encoding: binary ? null : "utf-8",
    maxBytes,
    capabilities,
    experimental: false,
    ...extra,
  });
}

const definitions = [
  record(".py", "code", "code", "text/plain", false, LIMITS.codeBytes, CAPABILITIES.code, { syntax: "python" }),
  record(".c", "code", "code", "text/plain", false, LIMITS.codeBytes, CAPABILITIES.code, { syntax: "c" }),
  record(".h", "code", "code", "text/plain", false, LIMITS.codeBytes, CAPABILITIES.code, { syntax: "c" }),
  record(".cpp", "code", "code", "text/plain", false, LIMITS.codeBytes, CAPABILITIES.code, { syntax: "cpp" }),
  record(".hpp", "code", "code", "text/plain", false, LIMITS.codeBytes, CAPABILITIES.code, { syntax: "cpp" }),
  record(".js", "code", "code", "text/plain", false, LIMITS.codeBytes, CAPABILITIES.code, { syntax: "javascript" }),
  record(".ts", "code", "code", "text/plain", false, LIMITS.codeBytes, CAPABILITIES.code, { syntax: "typescript" }),

  record(".md", "markdown", "documents", "text/markdown", false, LIMITS.markdownBytes, CAPABILITIES.markdown),
  record(".markdown", "markdown", "documents", "text/markdown", false, LIMITS.markdownBytes, CAPABILITIES.markdown),
  record(".mkd", "markdown", "documents", "text/markdown", false, LIMITS.markdownBytes, CAPABILITIES.markdown),
  record(".mdx", "markdown", "documents", "text/markdown", false, LIMITS.markdownBytes, CAPABILITIES.markdown),
  record(".txt", "text", "documents", "text/plain", false, LIMITS.textBytes, CAPABILITIES.text),
  record(".log", "log", "documents", "text/plain", false, LIMITS.textBytes, CAPABILITIES.log),
];

const DOCUMENT_TYPES = new Map(definitions.map((definition) => [definition.extension, definition]));
const DOCUMENT_EXTENSIONS = new Set(DOCUMENT_TYPES.keys());
const TEXT_DOCUMENT_EXTENSIONS = new Set(definitions.filter((definition) => !definition.binary).map((definition) => definition.extension));
const BINARY_DOCUMENT_EXTENSIONS = new Set(definitions.filter((definition) => definition.binary).map((definition) => definition.extension));
const EXPLICITLY_UNSUPPORTED_EXTENSIONS = new Set([
  ".csv", ".docx", ".epub", ".gif", ".htm", ".html", ".jpeg", ".jpg", ".json",
  ".odt", ".pdf", ".png", ".pptx", ".toml", ".tsv", ".webp", ".xls", ".xlsm",
  ".xlsx", ".yaml", ".yml",
]);

function normalizeExtension(value) {
  const candidate = String(value || "").toLowerCase();
  if (!candidate) return "";
  return candidate.startsWith(".") && !candidate.includes("/") && !candidate.includes("\\")
    ? candidate
    : path.extname(candidate);
}

function getDocumentType(value) {
  return DOCUMENT_TYPES.get(normalizeExtension(value)) || null;
}

function isSupportedDocument(value) {
  return Boolean(getDocumentType(value));
}

function isExplicitlyUnsupported(value) {
  return EXPLICITLY_UNSUPPORTED_EXTENSIONS.has(normalizeExtension(value));
}

function publicTypeRecord(value) {
  const definition = getDocumentType(value);
  if (!definition) return null;
  return {
    extension: definition.extension,
    ext: definition.ext,
    kind: definition.kind,
    category: definition.category,
    mime: definition.mime,
    binary: definition.binary,
    encoding: definition.encoding,
    maxBytes: definition.maxBytes,
    capabilities: { ...definition.capabilities },
    experimental: definition.experimental,
    ...(definition.syntax ? { syntax: definition.syntax } : {}),
    ...(definition.delimiter ? { delimiter: definition.delimiter } : {}),
  };
}

module.exports = {
  BINARY_DOCUMENT_EXTENSIONS,
  CAPABILITIES,
  DOCUMENT_EXTENSIONS,
  DOCUMENT_TYPES,
  EXPLICITLY_UNSUPPORTED_EXTENSIONS,
  LIMITS,
  TEXT_DOCUMENT_EXTENSIONS,
  getDocumentType,
  isExplicitlyUnsupported,
  isSupportedDocument,
  normalizeExtension,
  publicTypeRecord,
};

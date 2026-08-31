"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { fileURLToPath, pathToFileURL } = require("node:url");

const MARKDOWN_EXTENSIONS = new Set([".md", ".markdown", ".mkd", ".mdx"]);

function sourceFromFileArgument(value, { cwd = process.cwd(), statSync = fs.statSync } = {}) {
  if (typeof value !== "string" || !value || value.startsWith("-")) return null;
  let candidate;
  try {
    candidate = value.startsWith("file:") ? fileURLToPath(value) : path.resolve(cwd, value);
  } catch {
    return null;
  }
  if (!MARKDOWN_EXTENSIONS.has(path.extname(candidate).toLowerCase())) return null;
  try {
    if (!statSync(candidate).isFile()) return null;
  } catch {
    return null;
  }
  return pathToFileURL(candidate).href;
}

function firstMarkdownSource(argumentsList, options) {
  for (const value of Array.isArray(argumentsList) ? argumentsList : []) {
    const source = sourceFromFileArgument(value, options);
    if (source) return source;
  }
  return null;
}

module.exports = { MARKDOWN_EXTENSIONS, firstMarkdownSource, sourceFromFileArgument };

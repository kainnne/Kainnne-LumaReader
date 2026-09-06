"use strict";
const fs = require("node:fs/promises");
const path = require("node:path");
const { fileURLToPath } = require("node:url");
const { MARKDOWN_EXTENSIONS } = require("./open-target");

class DocumentWindows {
  constructor({ maxWindows = 8 } = {}) { this.maxWindows = maxWindows; this.contexts = new Set(); }
  async resolve(source) {
    if (/^https?:\/\//i.test(source)) return { key: new URL(source).href, source, root: null, path: null };
    const filePath = await fs.realpath(source.startsWith("file:") ? fileURLToPath(source) : path.resolve(source));
    if (!MARKDOWN_EXTENSIONS.has(path.extname(filePath).toLowerCase()) || !(await fs.stat(filePath)).isFile()) {
      throw new Error("Choose an existing Markdown document.");
    }
    return { key: filePath, root: path.dirname(filePath), path: path.basename(filePath), source };
  }
  find(key) { return key ? [...this.contexts].find((context) => context.documentPath === key && !context.window.isDestroyed()) : null; }
  add(context, key) {
    if (this.contexts.size >= this.maxWindows) throw new Error("Close a document window before opening another.");
    context.documentPath = key;
    this.contexts.add(context);
  }
  update(context, key) { context.documentPath = key; }
  remove(context) { this.contexts.delete(context); }
}
module.exports = { DocumentWindows };

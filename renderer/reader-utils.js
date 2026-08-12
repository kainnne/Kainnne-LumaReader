(function exposeReaderUtils(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LumaReaderUtils = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function createReaderUtils() {
  "use strict";

  function transformOutsideCode(source, transform) {
    const text = String(source || "");
    const codePattern = /```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`/g;
    let output = "";
    let lastIndex = 0;

    for (const match of text.matchAll(codePattern)) {
      output += transform(text.slice(lastIndex, match.index));
      output += match[0];
      lastIndex = match.index + match[0].length;
    }

    return output + transform(text.slice(lastIndex));
  }

  function normalizeStrongEmphasis(source) {
    return transformOutsideCode(source, (text) => text.replace(
      /(?<!\\)\*\*(?![\s*])([^*\n]*?[^\s*])(?<!\\)\*\*(?=[\p{L}\p{N}])/gu,
      "<strong>$1</strong>",
    ));
  }

  function ancestorFolderPaths(files) {
    const folders = new Set();

    for (const item of files || []) {
      const filePath = typeof item === "string" ? item : item?.path;
      if (!filePath) continue;
      const parts = String(filePath).split("/").filter(Boolean);
      parts.pop();
      let current = "";
      for (const part of parts) {
        current = current ? `${current}/${part}` : part;
        folders.add(current);
      }
    }

    return [...folders];
  }

  return { normalizeStrongEmphasis, ancestorFolderPaths };
}));

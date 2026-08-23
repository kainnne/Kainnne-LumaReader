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

  function markdownTokenLineStarts(tokens) {
    let line = 0;
    const starts = [];

    for (const token of tokens || []) {
      const raw = String(token?.raw || "");
      if (token?.type !== "space" && token?.type !== "def") starts.push(line);
      line += (raw.match(/\n/g) || []).length;
    }

    return starts;
  }

  function mapByAnchors(value, anchors) {
    const points = (anchors || [])
      .map((point) => [Number(point?.[0]), Number(point?.[1])])
      .filter(([input, output]) => Number.isFinite(input) && Number.isFinite(output))
      .sort((a, b) => a[0] - b[0]);
    if (!points.length) return 0;
    const input = Number(value) || 0;
    if (input <= points[0][0]) return points[0][1];
    if (input >= points.at(-1)[0]) return points.at(-1)[1];

    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const next = points[index];
      if (input > next[0]) continue;
      const span = next[0] - previous[0];
      if (span <= 0) return next[1];
      const progress = (input - previous[0]) / span;
      return previous[1] + (next[1] - previous[1]) * progress;
    }

    return points.at(-1)[1];
  }

  return { normalizeStrongEmphasis, ancestorFolderPaths, markdownTokenLineStarts, mapByAnchors };
}));

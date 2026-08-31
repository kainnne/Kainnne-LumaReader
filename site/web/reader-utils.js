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

  function isScrollAtEnd(scrollTop, scrollHeight, clientHeight, tolerance = 2) {
    const maximum = Math.max(0, (Number(scrollHeight) || 0) - (Number(clientHeight) || 0));
    const offset = Math.max(0, Number(scrollTop) || 0);
    const threshold = Math.max(0, Number(tolerance) || 0);
    return maximum === 0 || offset >= maximum - threshold;
  }

  function shouldOfferPreviewEnd(source, preview, sourceTolerance = 2, previewTolerance = sourceTolerance) {
    return isScrollAtEnd(source?.scrollTop, source?.scrollHeight, source?.clientHeight, sourceTolerance)
      && !isScrollAtEnd(preview?.scrollTop, preview?.scrollHeight, preview?.clientHeight, previewTolerance);
  }

  function replaceMarkdownRange(source, start, end, replacement, selectionStart, selectionEnd = selectionStart) {
    return { text: `${source.slice(0, start)}${replacement}${source.slice(end)}`, selectionStart: start + selectionStart, selectionEnd: start + selectionEnd };
  }

  function markdownLineRange(source, start, end) {
    const lineStart = source.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const effectiveEnd = end > start && source[end - 1] === "\n" ? end - 1 : end;
    const nextBreak = source.indexOf("\n", effectiveEnd);
    return [lineStart, nextBreak < 0 ? source.length : nextBreak];
  }

  function applyMarkdownCommand(value, selectionStart, selectionEnd, command, labels = {}) {
    const source = String(value || "");
    const start = Math.max(0, Math.min(source.length, Number(selectionStart) || 0));
    const end = Math.max(start, Math.min(source.length, Number(selectionEnd) || start));
    const selected = source.slice(start, end);
    const textLabel = labels.text || "text";
    const linkLabel = labels.link || "link text";
    if (["heading-1", "heading-2", "heading-3"].includes(command)) {
      const level = Number(command.at(-1));
      const [blockStart, blockEnd] = markdownLineRange(source, start, end);
      const replacement = source.slice(blockStart, blockEnd).split("\n").map((line) => `${"#".repeat(level)} ${line.replace(/^\s{0,3}#{1,6}\s+/, "") || textLabel}`).join("\n");
      return replaceMarkdownRange(source, blockStart, blockEnd, replacement, replacement.length, replacement.length);
    }
    if (["quote", "task", "list"].includes(command)) {
      const [blockStart, blockEnd] = markdownLineRange(source, start, end);
      const prefix = command === "quote" ? "> " : command === "task" ? "- [ ] " : "- ";
      const replacement = source.slice(blockStart, blockEnd).split("\n").map((line) => `${prefix}${line || textLabel}`).join("\n");
      return replaceMarkdownRange(source, blockStart, blockEnd, replacement, replacement.length, replacement.length);
    }
    if (command === "bold" || command === "italic") {
      const marker = command === "bold" ? "**" : "*", inner = selected || textLabel;
      return replaceMarkdownRange(source, start, end, `${marker}${inner}${marker}`, marker.length, marker.length + inner.length);
    }
    if (command === "link") {
      const label = selected || linkLabel, replacement = `[${label}](https://)`, urlStart = label.length + 3;
      return replaceMarkdownRange(source, start, end, replacement, urlStart, urlStart + 8);
    }
    if (command === "code") {
      if (selected.includes("\n")) return replaceMarkdownRange(source, start, end, `\`\`\`\n${selected}\n\`\`\``, 4, 4 + selected.length);
      const inner = selected || textLabel;
      return replaceMarkdownRange(source, start, end, `\`${inner}\``, 1, 1 + inner.length);
    }
    if (command === "table") {
      const headers = labels.tableHeaders || ["Column 1", "Column 2"], cells = labels.tableCells || ["Value", "Value"];
      const replacement = `| ${headers.join(" | ")} |\n| ${headers.map(() => "---").join(" | ")} |\n| ${cells.join(" | ")} |`;
      return replaceMarkdownRange(source, start, end, replacement, 2, 2 + headers[0].length);
    }
    return { text: source, selectionStart: start, selectionEnd: end };
  }

  return { normalizeStrongEmphasis, ancestorFolderPaths, markdownTokenLineStarts, mapByAnchors, isScrollAtEnd, shouldOfferPreviewEnd, applyMarkdownCommand };
}));

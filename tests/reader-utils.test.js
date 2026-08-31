"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const marked = require("../renderer/vendor/marked/marked.umd.js");
const {
  normalizeStrongEmphasis,
  ancestorFolderPaths,
  markdownTokenLineStarts,
  mapByAnchors,
  isScrollAtEnd,
  shouldOfferPreviewEnd,
  applyMarkdownCommand,
} = require("../renderer/reader-utils.js");

test("normalizes bold labels followed immediately by CJK text", () => {
  const source = "- **時間地點：**三年後，婚禮當天\n- **在場：**林砚舟、秦若嵐";
  const html = marked.parse(normalizeStrongEmphasis(source), { gfm: true, breaks: false });

  assert.match(html, /<strong>時間地點：<\/strong>三年後/);
  assert.match(html, /<strong>在場：<\/strong>林砚舟/);
  assert.doesNotMatch(html, /\*\*時間地點/);
});

test("does not normalize strong-like text inside code", () => {
  const source = "`**標籤：**內容`\n\n```md\n**標籤：**內容\n```";
  assert.equal(normalizeStrongEmphasis(source), source);
});

test("collects every ancestor folder for matching search results", () => {
  assert.deepEqual(
    ancestorFolderPaths([
      { path: "Projects/Reader/docs/guide.md" },
      { path: "Projects/Reader/notes.md" },
      { path: "Archive/logs/app.log" },
    ]),
    ["Projects", "Projects/Reader", "Projects/Reader/docs", "Archive", "Archive/logs"],
  );
});

test("tracks source line starts for rendered Markdown blocks", () => {
  const source = "# Title\n\nFirst paragraph\nsecond line\n\n- one\n- two\n\n```js\nconst x = 1;\n```\n";
  const tokens = marked.lexer(source, { gfm: true, breaks: false });

  assert.deepEqual(markdownTokenLineStarts(tokens), [0, 2, 5, 8]);
});

test("maps scroll positions piecewise between content anchors", () => {
  const anchors = [[0, 0], [100, 180], [300, 420], [500, 900]];

  assert.equal(mapByAnchors(-20, anchors), 0);
  assert.equal(mapByAnchors(50, anchors), 90);
  assert.equal(mapByAnchors(200, anchors), 300);
  assert.equal(mapByAnchors(500, anchors), 900);
  assert.equal(mapByAnchors(900, anchors), 900);
});

test("recognizes the visual end of a scroll range within a small layout tolerance", () => {
  assert.equal(isScrollAtEnd(700, 1000, 300), true);
  assert.equal(isScrollAtEnd(694.5, 1000, 300, 6), true);
  assert.equal(isScrollAtEnd(693.5, 1000, 300, 6), false);
  assert.equal(isScrollAtEnd(0, 240, 300), true);
});

test("offers an explicit preview-end action only when source is at the end and preview is not", () => {
  const sourceAtEnd = { scrollTop: 700, scrollHeight: 1000, clientHeight: 300 };
  const sourceAboveEnd = { scrollTop: 640, scrollHeight: 1000, clientHeight: 300 };
  const previewAboveEnd = { scrollTop: 900, scrollHeight: 1400, clientHeight: 300 };
  const previewAtEnd = { scrollTop: 1100, scrollHeight: 1400, clientHeight: 300 };

  assert.equal(shouldOfferPreviewEnd(sourceAtEnd, previewAboveEnd), true);
  assert.equal(shouldOfferPreviewEnd(sourceAboveEnd, previewAboveEnd), false);
  assert.equal(shouldOfferPreviewEnd(sourceAtEnd, previewAtEnd), false);
});

test("applies inline Markdown commands while preserving an editor selection", () => {
  const bold = applyMarkdownCommand("A useful note", 2, 8, "bold");
  assert.equal(bold.text, "A **useful** note");
  assert.deepEqual([bold.selectionStart, bold.selectionEnd], [4, 10]);

  const link = applyMarkdownCommand("Read docs", 5, 9, "link");
  assert.equal(link.text, "Read [docs](https://)");
  assert.equal(link.text.slice(link.selectionStart, link.selectionEnd), "https://");
});

test("applies headings and block commands to complete editor lines", () => {
  const heading = applyMarkdownCommand("Intro\nOld title\nBody", 8, 8, "heading-2");
  assert.equal(heading.text, "Intro\n## Old title\nBody");

  const tasks = applyMarkdownCommand("one\ntwo\nthree", 0, 7, "task");
  assert.equal(tasks.text, "- [ ] one\n- [ ] two\nthree");
});

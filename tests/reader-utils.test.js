"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const marked = require("../renderer/vendor/marked/marked.umd.js");
const { normalizeStrongEmphasis, ancestorFolderPaths } = require("../renderer/reader-utils.js");

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

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const core = require("../renderer/adapters/core");
const plain = require("../renderer/adapters/plain-text");
const registry = require("../renderer/adapters/index");

test("extracts extensions without trusting query strings or fragments", () => {
  assert.equal(core.extensionOf("notes.TXT?download=1"), ".txt");
  assert.equal(core.extensionOf("events.log#latest"), ".log");
  assert.equal(core.extensionOf("archive"), "");
});

test("finds text matches with stable line and column locations", () => {
  assert.deepEqual(core.findTextMatches("alpha\nbeta alpha", "alpha").map(({ line, column }) => ({ line, column })), [
    { line: 1, column: 1 },
    { line: 2, column: 6 },
  ]);
});

test("reflows logical pages when the available width changes", () => {
  const lines = ["heading", "x".repeat(600), "tail"];
  const narrow = core.paginateLogicalLines(lines, { width: 300, height: 300, fontSize: 16 });
  const wide = core.paginateLogicalLines(lines, { width: 1200, height: 300, fontSize: 16 });
  assert.ok(narrow.length > wide.length);
  assert.equal(core.pageForLogicalLine(narrow, 2), narrow.length);
});

test("splits CRLF and creates bounded logical ranges", () => {
  const lines = plain.splitLines("one\r\ntwo\rthree");
  assert.deepEqual(lines, ["one", "two", "three"]);
  assert.deepEqual(plain.pageRanges(lines, 2), [{ start: 0, end: 2 }, { start: 2, end: 3 }]);
});

test("selects a safe adapter only for txt and log", () => {
  for (const name of ["notes.txt", "events.log"]) {
    const adapter = registry.createAdapterFor({ name });
    assert.ok(adapter instanceof plain.PlainTextAdapter);
    for (const method of ["canOpen", "loadDocument", "renderDocument", "supportsPagedMode", "getPageCount", "goToPage", "search", "dispose"]) {
      assert.equal(typeof adapter[method], "function", `${name} implements ${method}`);
    }
    adapter.dispose();
  }
  for (const name of ["README.md", "manual.pdf", "data.json", "book.xlsx", "image.png"]) {
    assert.equal(registry.createAdapterFor({ name }), null);
  }
});

test("plain-text loading preserves long unwrapped lines for horizontal scrolling", async () => {
  const adapter = new plain.PlainTextAdapter({ wrap: false });
  const longLine = "prefix-" + "x".repeat(5000);
  await adapter.loadDocument({ name: "events.log", kind: "log", text: `${longLine}\nsecond` });
  assert.equal(adapter.document.text.split("\n")[0], longLine);
  assert.equal(adapter.wrap, false);
  assert.equal(adapter.getPageCount() >= 1, true);
  adapter.dispose();
});

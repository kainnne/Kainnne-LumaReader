"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { DOCUMENT_EXTENSIONS, LocalReaderService, scanDocuments } = require("../src/local-server");

const repositoryRoot = path.resolve(__dirname, "..");
const fixtureRoot = path.join(__dirname, "fixtures");
const service = new LocalReaderService({
  rendererRoot: path.join(repositoryRoot, "renderer"),
  libraryRoot: fixtureRoot,
});

test("stores the selected library and supported extensions", () => {
  assert.equal(service.getLibraryRoot(), fixtureRoot);
  assert.deepEqual([...DOCUMENT_EXTENSIONS].sort(), [".markdown", ".md", ".mdx", ".mkd"]);
});

test("discovers Markdown, MDX, and Markdown aliases recursively", async () => {
  const files = await scanDocuments(fixtureRoot);
  const paths = files.map((file) => file.path);
  assert.ok(paths.includes("feature-matrix.md"));
  assert.ok(paths.includes("sample.mdx"));
  assert.ok(paths.includes("nested/sample.markdown"));
});

test("opens a project document and expands a local include", async () => {
  const data = await service.openSource("feature-matrix.md");
  assert.equal(data.sourceType, "project");
  assert.match(data.renderText, /loaded from an included Markdown document/);
});

test("opens an explicit file URL without changing the library", async () => {
  const source = pathToFileURL(path.join(fixtureRoot, "sample.mdx")).href;
  const data = await service.openSource(source);
  assert.equal(data.sourceType, "external");
  assert.equal(data.name, "sample.mdx");
  assert.equal(service.getLibraryRoot(), fixtureRoot);
});

test("resolves relative local media inside the library", () => {
  const media = service.resolveMedia("media/sample.svg", "feature-matrix.md");
  assert.equal(media, path.join(fixtureRoot, "media", "sample.svg"));
  assert.match(fs.readFileSync(media, "utf8"), /LumaReader/);
});

test("blocks project traversal outside the selected library", () => {
  assert.throws(
    () => service.resolveProjectDocument("../package.json"),
    /outside the selected library/i,
  );
});

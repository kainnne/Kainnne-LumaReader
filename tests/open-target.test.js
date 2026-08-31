"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const test = require("node:test");
const packageMetadata = require("../package.json");
const { firstMarkdownSource, sourceFromFileArgument } = require("../src/open-target");

const fakeFile = { isFile: () => true };

test("turns Markdown file arguments into file URLs", () => {
  const expected = pathToFileURL(path.resolve("/documents/Notes.md")).href;
  assert.equal(sourceFromFileArgument("/documents/Notes.md", { statSync: () => fakeFile }), expected);
  assert.equal(sourceFromFileArgument(expected, { statSync: () => fakeFile }), expected);
});

test("accepts supported Markdown extensions case-insensitively", () => {
  for (const name of ["a.md", "a.markdown", "a.mkd", "a.MDX"]) {
    assert.ok(sourceFromFileArgument(name, { cwd: "/documents", statSync: () => fakeFile }));
  }
});

test("ignores flags, unsupported formats, directories, and missing paths", () => {
  assert.equal(sourceFromFileArgument("--dev", { statSync: () => fakeFile }), null);
  assert.equal(sourceFromFileArgument("notes.txt", { statSync: () => fakeFile }), null);
  assert.equal(sourceFromFileArgument("notes.md", { statSync: () => ({ isFile: () => false }) }), null);
  assert.equal(sourceFromFileArgument("notes.md", { statSync: () => { throw new Error("missing"); } }), null);
});

test("finds the first valid Markdown target in a launch command", () => {
  const target = firstMarkdownSource(["electron", "--dev", "notes.md", "later.md"], {
    cwd: "/documents",
    statSync: () => fakeFile,
  });
  assert.equal(target, pathToFileURL("/documents/notes.md").href);
});

test("publishes Markdown file associations for Open With", () => {
  assert.deepEqual(packageMetadata.build.fileAssociations, [{
    ext: ["md", "markdown", "mkd", "mdx"],
    name: "Kainnne LumaReader Markdown",
    description: "Markdown document",
    role: "Editor",
  }]);
});

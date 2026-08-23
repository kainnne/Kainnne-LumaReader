"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Writable } = require("node:stream");
const { finished } = require("node:stream/promises");
const { pathToFileURL } = require("node:url");
const { DOCUMENT_EXTENSIONS, LocalReaderService, markdownFileName, scanDocuments } = require("../src/local-server");
const { BINARY_DOCUMENT_EXTENSIONS, EXPLICITLY_UNSUPPORTED_EXTENSIONS, getDocumentType } = require("../src/document-types");

const repositoryRoot = path.resolve(__dirname, "..");
const fixtureRoot = path.join(__dirname, "fixtures");
const service = new LocalReaderService({
  rendererRoot: path.join(repositoryRoot, "renderer"),
  libraryRoot: fixtureRoot,
});

class MemoryResponse extends Writable {
  constructor() {
    super();
    this.chunks = [];
    this.statusCode = null;
    this.headers = {};
  }
  _write(chunk, _encoding, callback) { this.chunks.push(Buffer.from(chunk)); callback(); }
  writeHead(statusCode, headers) {
    this.statusCode = statusCode;
    this.headers = Object.fromEntries(Object.entries(headers).map(([name, value]) => [name.toLowerCase(), String(value)]));
    return this;
  }
  body() { return Buffer.concat(this.chunks); }
}

async function dispatch(targetService, url, options = {}) {
  const response = new MemoryResponse();
  await targetService.route({
    url,
    method: options.method || "GET",
    headers: { host: "127.0.0.1", ...(options.headers || {}) },
  }, response);
  if (!response.writableFinished) await finished(response);
  return response;
}

test("exposes only Markdown and plain-text extensions", () => {
  assert.deepEqual([...DOCUMENT_EXTENSIONS].sort(), [".log", ".markdown", ".md", ".mdx", ".mkd", ".txt"]);
  assert.deepEqual([...BINARY_DOCUMENT_EXTENSIONS], []);
  for (const extension of [".pdf", ".json", ".yaml", ".csv", ".xlsx", ".png", ".gif"]) {
    assert.ok(EXPLICITLY_UNSUPPORTED_EXTENSIONS.has(extension));
    assert.equal(getDocumentType(extension), null);
  }
});

test("publishes stable text-only metadata", () => {
  assert.deepEqual(
    { kind: getDocumentType("README.md").kind, mime: getDocumentType("README.md").mime, binary: getDocumentType("README.md").binary },
    { kind: "markdown", mime: "text/markdown", binary: false },
  );
  assert.equal(getDocumentType("events.log").capabilities.monospaced, true);
  assert.equal(getDocumentType("notes.txt").capabilities.wrap, true);
});

test("discovers Markdown aliases recursively", async () => {
  const files = await scanDocuments(fixtureRoot);
  const paths = files.map((file) => file.path);
  assert.ok(paths.includes("feature-matrix.md"));
  assert.ok(paths.includes("sample.mdx"));
  assert.ok(paths.includes("nested/sample.markdown"));
});

test("scans text formats and excludes every retired format", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lumareader-text-scan-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const supported = ["readme.md", "notes.markdown", "draft.mkd", "component.mdx", "plain.txt", "events.log"];
  const retired = ["manual.pdf", "data.json", "config.yaml", "rows.csv", "book.xlsx", "image.png"];
  for (const name of [...supported, ...retired]) fs.writeFileSync(path.join(root, name), "fixture");
  const files = await scanDocuments(root);
  assert.deepEqual(files.map((file) => file.name).sort(), supported.sort());
  assert.ok(files.every((file) => file.binary === false && file.category === "documents"));
});

test("bounds broad root scans by directory and file limits", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lumareader-bounded-scan-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const name of ["01.md", "02.md", "03.md"]) fs.writeFileSync(path.join(root, name), name);
  fs.mkdirSync(path.join(root, "nested"));
  fs.writeFileSync(path.join(root, "nested", "04.md"), "nested");

  const fileLimited = await scanDocuments(root, { maxFiles: 2 });
  assert.equal(fileLimited.length, 2);
  const directoryLimited = await scanDocuments(root, { maxDirectories: 1, maxFiles: 10 });
  assert.ok(directoryLimited.every((file) => !file.path.startsWith("nested/")));
});

test("opens Markdown and expands a local include", async () => {
  const data = await service.openSource("feature-matrix.md");
  assert.equal(data.sourceType, "project");
  assert.equal(data.kind, "markdown");
  assert.match(data.renderText, /loaded from an included Markdown document/);
});

test("opens plain text without Markdown include expansion", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lumareader-text-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "note.txt"), "!INCLUDE \"other.md\"");
  fs.writeFileSync(path.join(root, "other.md"), "secret");
  const textService = new LocalReaderService({ rendererRoot: path.join(repositoryRoot, "renderer"), libraryRoot: root });
  const payload = await textService.openSource("note.txt");
  assert.equal(payload.kind, "text");
  assert.equal(payload.content.mode, "text");
  assert.equal(payload.renderText, "!INCLUDE \"other.md\"");
});

test("saves Markdown inside the selected library and returns the refreshed payload", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lumareader-edit-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "draft.md"), "# Before\n");
  const editingService = new LocalReaderService({ rendererRoot: path.join(repositoryRoot, "renderer"), libraryRoot: root });
  const before = await editingService.openSource("draft.md");
  const after = await editingService.saveMarkdownDocument("draft.md", "# After\n\nSaved locally.\n", before.modifiedNs);

  assert.equal(fs.readFileSync(path.join(root, "draft.md"), "utf8"), "# After\n\nSaved locally.\n");
  assert.equal(after.sourceType, "project");
  assert.equal(after.kind, "markdown");
  assert.equal(after.text, "# After\n\nSaved locally.\n");
  assert.ok(after.modifiedNs >= before.modifiedNs);
});

test("creates a new Markdown document in the current library folder without overwriting", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lumareader-create-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "notes"));
  const createService = new LocalReaderService({ rendererRoot: path.join(repositoryRoot, "renderer"), libraryRoot: root });

  const created = await createService.createMarkdownDocument("notes", "Meeting notes");
  assert.equal(created.path, "notes/Meeting notes.md");
  assert.equal(created.kind, "markdown");
  assert.equal(fs.readFileSync(path.join(root, created.path), "utf8"), "");
  const refreshedPaths = (await scanDocuments(root)).map((file) => file.path);
  assert.ok(refreshedPaths.includes(created.path), "a newly created document is visible on the next sidebar scan");
  const createdAtRoot = await createService.createMarkdownDocument("", "Root note.md");
  assert.equal(createdAtRoot.path, "Root note.md");
  assert.equal(fs.readFileSync(path.join(root, createdAtRoot.path), "utf8"), "");
  await assert.rejects(
    () => createService.createMarkdownDocument("notes", "Meeting notes.md"),
    (error) => error.code === "DOCUMENT_ALREADY_EXISTS",
  );
});

test("validates new Markdown names and keeps creation inside the selected library", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lumareader-create-guard-"));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "lumareader-create-outside-"));
  t.after(() => { fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(outside, { recursive: true, force: true }); });
  fs.symlinkSync(outside, path.join(root, "escape"));
  const createService = new LocalReaderService({ rendererRoot: path.join(repositoryRoot, "renderer"), libraryRoot: root });

  assert.equal(markdownFileName("新筆記"), "新筆記.md");
  assert.equal(markdownFileName("already.md"), "already.md");
  for (const invalid of ["", "../escape", "bad:name", "CON", ".md", "trailing."]) {
    assert.throws(() => markdownFileName(invalid), (error) => error.code === "INVALID_DOCUMENT_NAME");
  }
  await assert.rejects(() => createService.createMarkdownDocument("../", "outside"), /outside the selected library/i);
  await assert.rejects(() => createService.createMarkdownDocument("escape", "outside"), /outside the selected library/i);
  assert.equal(fs.readdirSync(outside).length, 0);
});

test("keeps plain text read-only and refuses stale Markdown saves", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lumareader-edit-guard-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "draft.md"), "original");
  fs.writeFileSync(path.join(root, "notes.txt"), "plain text");
  const editingService = new LocalReaderService({ rendererRoot: path.join(repositoryRoot, "renderer"), libraryRoot: root });
  const original = await editingService.openSource("draft.md");

  await assert.rejects(
    () => editingService.saveMarkdownDocument("notes.txt", "changed"),
    (error) => error.code === "DOCUMENT_READ_ONLY",
  );
  fs.writeFileSync(path.join(root, "draft.md"), "changed elsewhere");
  const future = new Date(Date.now() + 2_000);
  fs.utimesSync(path.join(root, "draft.md"), future, future);
  await assert.rejects(
    () => editingService.saveMarkdownDocument("draft.md", "should not overwrite", original.modifiedNs),
    (error) => error.code === "DOCUMENT_CHANGED",
  );
  assert.equal(fs.readFileSync(path.join(root, "draft.md"), "utf8"), "changed elsewhere");
});

test("blocks Markdown saves through traversal and out-of-library symlinks", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lumareader-edit-links-"));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "lumareader-edit-outside-"));
  t.after(() => { fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(outside, { recursive: true, force: true }); });
  fs.writeFileSync(path.join(outside, "outside.md"), "outside");
  fs.symlinkSync(path.join(outside, "outside.md"), path.join(root, "escape.md"));
  const editingService = new LocalReaderService({ rendererRoot: path.join(repositoryRoot, "renderer"), libraryRoot: root });

  await assert.rejects(() => editingService.saveMarkdownDocument("../outside.md", "changed"), /outside the selected library/i);
  await assert.rejects(() => editingService.saveMarkdownDocument("escape.md", "changed"), /outside the selected library/i);
  assert.equal(fs.readFileSync(path.join(outside, "outside.md"), "utf8"), "outside");
});

test("opens an explicit supported file URL without changing the library", async () => {
  const source = pathToFileURL(path.join(fixtureRoot, "sample.mdx")).href;
  const data = await service.openSource(source);
  assert.equal(data.sourceType, "external");
  assert.equal(data.name, "sample.mdx");
  assert.equal(service.getLibraryRoot(), fixtureRoot);
});

test("rejects retired formats on direct open and project resolution", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lumareader-retired-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const name of ["manual.pdf", "data.json", "image.png"]) fs.writeFileSync(path.join(root, name), "not supported");
  const retiredService = new LocalReaderService({ rendererRoot: path.join(repositoryRoot, "renderer"), libraryRoot: root });
  for (const name of ["manual.pdf", "data.json", "image.png"]) {
    await assert.rejects(() => retiredService.openSource(path.join(root, name)), /unsupported document type/i);
    assert.throws(() => retiredService.resolveProjectDocument(name), /unsupported document type/i);
  }
});

test("reports invalid UTF-8 instead of replacing text", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lumareader-encoding-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "broken.txt"), Buffer.from([0xc3, 0x28]));
  const encodingService = new LocalReaderService({ rendererRoot: path.join(repositoryRoot, "renderer"), libraryRoot: root });
  await assert.rejects(() => encodingService.openSource("broken.txt"), (error) => error.code === "TEXT_DECODING_FAILED");
});

test("blocks traversal and symlinks outside the selected library", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lumareader-links-"));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "lumareader-outside-"));
  t.after(() => { fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(outside, { recursive: true, force: true }); });
  fs.writeFileSync(path.join(outside, "outside.md"), "outside");
  fs.symlinkSync(path.join(outside, "outside.md"), path.join(root, "escape.md"));
  const secureService = new LocalReaderService({ rendererRoot: path.join(repositoryRoot, "renderer"), libraryRoot: root });
  assert.throws(() => secureService.resolveProjectDocument("../outside.md"), /outside the selected library/i);
  assert.throws(() => secureService.resolveProjectDocument("escape.md"), /outside the selected library/i);
});

test("resolves website-root images through the nearest project public folder", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lumareader-project-media-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const project = path.join(root, "WikiNB");
  const document = path.join(project, "wiki", "AboutMe", "about.md");
  const image = path.join(project, "public", "images", "AboutMe", "portrait.jpg");
  fs.mkdirSync(path.dirname(document), { recursive: true });
  fs.mkdirSync(path.dirname(image), { recursive: true });
  fs.writeFileSync(path.join(project, "package.json"), "{}");
  fs.writeFileSync(document, "![Portrait](/images/AboutMe/portrait.jpg)");
  fs.writeFileSync(image, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
  const mediaService = new LocalReaderService({ rendererRoot: path.join(repositoryRoot, "renderer"), libraryRoot: root });

  assert.equal(mediaService.resolveMedia("/images/AboutMe/portrait.jpg", "WikiNB/wiki/AboutMe/about.md"), fs.realpathSync(image));
  const query = new URLSearchParams({ path: "/images/AboutMe/portrait.jpg", from: "WikiNB/wiki/AboutMe/about.md" });
  const response = await dispatch(mediaService, `/api/media?${query}`);
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["content-type"], "image/jpeg");
  assert.deepEqual(response.body(), Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
});

test("keeps relative images local and rejects non-media assets", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lumareader-relative-media-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "docs", "assets"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs", "readme.md"), "![Asset](assets/pixel.png)");
  fs.writeFileSync(path.join(root, "docs", "assets", "pixel.png"), "png");
  fs.writeFileSync(path.join(root, "docs", "assets", "secret.txt"), "text");
  const mediaService = new LocalReaderService({ rendererRoot: path.join(repositoryRoot, "renderer"), libraryRoot: root });

  assert.equal(mediaService.resolveMedia("assets/pixel.png", "docs/readme.md"), fs.realpathSync(path.join(root, "docs", "assets", "pixel.png")));
  const query = new URLSearchParams({ path: "assets/secret.txt", from: "docs/readme.md" });
  const response = await dispatch(mediaService, `/api/media?${query}`);
  assert.equal(response.statusCode, 415);
  assert.equal(JSON.parse(response.body().toString("utf8")).code, "UNSUPPORTED_MEDIA_TYPE");
});

test("keeps relative images portable across computers and Unicode folder names", async (t) => {
  const originalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lumareader-portable-media-original-"));
  const movedRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lumareader-portable-media-moved-"));
  t.after(() => { fs.rmSync(originalRoot, { recursive: true, force: true }); fs.rmSync(movedRoot, { recursive: true, force: true }); });
  const relativeDocument = "文件/閱讀筆記.md";
  const relativeImage = "文件/圖片/示例 圖片.png";
  const imageBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  fs.mkdirSync(path.join(originalRoot, "文件", "圖片"), { recursive: true });
  fs.writeFileSync(path.join(originalRoot, relativeDocument), "![示例](圖片/示例%20圖片.png)");
  fs.writeFileSync(path.join(originalRoot, relativeImage), imageBytes);
  fs.cpSync(path.join(originalRoot, "文件"), path.join(movedRoot, "文件"), { recursive: true });

  const movedService = new LocalReaderService({ rendererRoot: path.join(repositoryRoot, "renderer"), libraryRoot: movedRoot });
  assert.equal(movedService.resolveMedia("圖片/示例%20圖片.png", relativeDocument), fs.realpathSync(path.join(movedRoot, relativeImage)));
  const query = new URLSearchParams({ path: "圖片/示例%20圖片.png", from: relativeDocument });
  const response = await dispatch(movedService, `/api/media?${query}`);
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["content-type"], "image/png");
  assert.deepEqual(response.body(), imageBytes);
});

test("enforces the per-format preview limit", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lumareader-limit-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const large = path.join(root, "large.md");
  fs.writeFileSync(large, "x");
  fs.truncateSync(large, getDocumentType(".md").maxBytes + 1);
  const limitedService = new LocalReaderService({ rendererRoot: path.join(repositoryRoot, "renderer"), libraryRoot: root });
  await assert.rejects(() => limitedService.openSource("large.md"), /exceeds the 8 MB preview limit/i);
});

test("publishes only six types through the API", async () => {
  const response = await dispatch(service, "/api/types");
  const payload = JSON.parse(response.body().toString("utf8"));
  assert.equal(response.statusCode, 200);
  assert.deepEqual(payload.extensions, [".log", ".markdown", ".md", ".mdx", ".mkd", ".txt"]);
  assert.ok(payload.types.every((type) => type.binary === false));
});

test("does not expose text files through the binary content endpoint", async () => {
  const response = await dispatch(service, "/api/content?path=feature-matrix.md");
  const error = JSON.parse(response.body().toString("utf8"));
  assert.equal(response.statusCode, 415);
  assert.equal(error.code, "TEXT_DOCUMENT");
});

test("rejects non-loopback hosts and mutating methods", async () => {
  const hostResponse = await dispatch(service, "/api/health", { headers: { host: "reader.attacker.example" } });
  assert.equal(hostResponse.statusCode, 403);
  const methodResponse = await dispatch(service, "/api/health", { method: "POST" });
  assert.equal(methodResponse.statusCode, 405);
});

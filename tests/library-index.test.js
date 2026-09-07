"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { LibraryIndex, IOPool } = require("../src/library-index");
const { LocalReaderService } = require("../src/local-server");
const { createIndex, normalize } = require("../renderer/library-search");

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lumareader-index-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function makeIndex(root, options = {}) {
  return new LibraryIndex(root, {
    isDocument: (file) => /\.(md|markdown|txt)$/i.test(file),
    publicFileRecord: (boundary, file, stat) => ({
      path: path.relative(boundary, file).split(path.sep).join("/"),
      name: path.basename(file), size: stat.size,
    }),
    ignoredDirectories: new Set(["node_modules", ".git"]),
    ...options,
  });
}

async function finish(index) {
  for (let i = 0; i < 5_000; i += 1) {
    const result = await index.advance();
    if (!result.scan.hasMore) return result;
  }
  throw new Error("Index did not finish within the fixture work budget");
}

test("resumes beyond 256 directories and 2000 files without dropping deep Chinese paths", async (t) => {
  const root = fixture(t);
  for (let i = 0; i < 270; i += 1) {
    const directory = path.join(root, `folder-${i}`, "子資料夾");
    fs.mkdirSync(directory, { recursive: true });
    for (let j = 0; j < 8; j += 1) fs.writeFileSync(path.join(directory, `${j}-筆記.md`), "# Note");
  }
  const target = "folder-269/子資料夾/01-還沒寄出的喜帖-比對基準.md";
  fs.writeFileSync(path.join(root, ...target.split("/")), "# 喜帖");
  const index = makeIndex(root, { limits: { operationsPerSlice: 80 } });
  t.after(() => index.dispose());
  const first = await index.advance();
  assert.equal(first.scan.hasMore, true);
  assert.equal(first.scan.complete, false);
  const result = await finish(index);
  assert.equal(result.scan.status, "complete");
  assert.equal(result.files.length, 2_161);
  assert.equal(result.scan.directoriesScanned, 541);
  assert.ok(result.files.some((file) => file.path === target));
  assert.equal(new Set(result.files.map((file) => file.path)).size, result.files.length);
});

test("a slow folder remains pending and resumes without extra outstanding filesystem calls", async (t) => {
  const root = fixture(t);
  for (const name of ["slow-a", "slow-b"]) {
    fs.mkdirSync(path.join(root, name));
    fs.writeFileSync(path.join(root, name, "visible.md"), "metadata only");
  }
  const releases = [];
  const calls = new Map();
  const pool = new IOPool(2);
  const io = {
    realpath: fsp.realpath, lstat: fsp.lstat,
    opendir: (directory, options) => {
      if (!path.basename(directory).startsWith("slow-")) return fsp.opendir(directory, options);
      calls.set(directory, (calls.get(directory) || 0) + 1);
      return new Promise((resolve, reject) => releases.push(() => fsp.opendir(directory, options).then(resolve, reject)));
    },
  };
  const index = makeIndex(root, { io, pool, limits: { concurrency: 2, sliceMs: 15, stalledAfterMs: 5 } });
  t.after(async () => { await Promise.all(releases.splice(0).map((release) => release())); index.dispose(); });
  let result;
  for (let i = 0; i < 12; i += 1) result = await index.advance();
  assert.equal(result.scan.status, "waiting");
  assert.equal(result.scan.complete, false);
  assert.ok(pool.active <= 2);
  assert.equal(calls.size, 2);
  assert.ok([...calls.values()].every((count) => count === 1));
  assert.equal(result.scan.stalledPaths.length, 2);
  await Promise.all(releases.splice(0).map((release) => release()));
  result = await finish(index);
  assert.equal(result.scan.status, "complete");
  assert.equal(result.files.length, 2);
});

test("permission failures and iCloud placeholders are visible as incomplete results without reading content", async (t) => {
  const root = fixture(t);
  fs.mkdirSync(path.join(root, "restricted"));
  fs.writeFileSync(path.join(root, "local.md"), "# Local");
  fs.writeFileSync(path.join(root, ".雲端文件.md.icloud"), "placeholder");
  const io = {
    realpath: fsp.realpath, lstat: fsp.lstat,
    opendir: (directory, options) => {
      if (path.basename(directory) === "restricted") return Promise.reject(Object.assign(new Error("denied"), { code: "EACCES" }));
      return fsp.opendir(directory, options);
    },
    readFile: () => { throw new Error("Index must never hydrate or read file contents"); },
  };
  const index = makeIndex(root, { io });
  t.after(() => index.dispose());
  const result = await finish(index);
  assert.equal(result.scan.status, "partial");
  assert.equal(result.scan.hasMore, false);
  assert.equal(result.scan.complete, false);
  assert.deepEqual(result.files.map((file) => file.path), ["local.md"]);
  assert.ok(result.scan.issues.some((issue) => issue.code === "EACCES" && issue.path === "restricted"));
  assert.ok(result.scan.issues.some((issue) => issue.code === "CLOUD_PLACEHOLDER" && issue.path === "雲端文件.md"));
});

test("resource caps are explicitly limited and never claim a complete scan", async (t) => {
  const root = fixture(t);
  for (let i = 0; i < 20; i += 1) fs.writeFileSync(path.join(root, `${i}.md`), "x");
  const index = makeIndex(root, { limits: { maxFiles: 5 } });
  t.after(() => index.dispose());
  const result = await finish(index);
  assert.equal(result.files.length, 5);
  assert.equal(result.scan.status, "limited");
  assert.equal(result.scan.limitReason, "files");
  assert.equal(result.scan.complete, false);
  assert.equal(result.scan.hasMore, false);
});

test("delta API resets stale cursors, deduplicates in-progress refresh, and rescans changes after completion", async (t) => {
  const root = fixture(t);
  for (let i = 0; i < 12; i += 1) fs.writeFileSync(path.join(root, `${i}.md`), "x");
  const service = new LocalReaderService({ rendererRoot: path.resolve(__dirname, "../renderer"), libraryRoot: root });
  service.libraryIndex = makeIndex(root, { limits: { operationsPerSlice: 4 } });
  t.after(() => service.close());
  let result = await service.scanLibrary({ cursor: 0 });
  const originalId = result.scan.id;
  assert.equal(result.reset, true);
  const accumulated = new Map(result.files.map((file) => [file.path, file]));
  result = await service.scanLibrary({ cursor: result.nextCursor, scanId: result.scan.id, refresh: true });
  assert.equal(result.scan.id, originalId);
  assert.equal(result.reset, false);
  for (let i = 0; i < 100 && result.scan.hasMore; i += 1) {
    for (const file of result.files) {
      assert.equal(accumulated.has(file.path), false);
      accumulated.set(file.path, file);
    }
    result = await service.scanLibrary({ cursor: result.nextCursor, scanId: result.scan.id });
  }
  for (const file of result.files) accumulated.set(file.path, file);
  assert.equal(result.scan.complete, true);
  assert.equal(accumulated.size, 12);
  fs.unlinkSync(path.join(root, "0.md"));
  fs.writeFileSync(path.join(root, "新增.md"), "new");
  result = await service.scanLibrary({ cursor: result.nextCursor, scanId: originalId, refresh: true });
  assert.notEqual(result.scan.id, originalId);
  assert.equal(result.reset, true);
  assert.ok(result.files.some((file) => file.path === "新增.md"));
  assert.ok(result.files.every((file) => file.path !== "0.md"));
  const repeated = await service.scanLibrary({ cursor: result.nextCursor, scanId: result.scan.id });
  assert.deepEqual(repeated.files, []);
  const stale = await service.scanLibrary({ cursor: 99, scanId: originalId });
  assert.equal(stale.reset, true);
  assert.equal(stale.files.length, 12);
});

test("directory traversal never follows external symlinks or ignored app/dependency folders", async (t) => {
  const root = fixture(t);
  const outside = fixture(t);
  fs.writeFileSync(path.join(outside, "secret.md"), "secret");
  for (const name of ["node_modules", "Sample.app", ".git"]) {
    fs.mkdirSync(path.join(root, name));
    fs.writeFileSync(path.join(root, name, "ignored.md"), "ignored");
  }
  fs.symlinkSync(outside, path.join(root, "outside-link"), process.platform === "win32" ? "junction" : "dir");
  fs.writeFileSync(path.join(root, "normal.md"), "normal");
  const index = makeIndex(root);
  t.after(() => index.dispose());
  const result = await finish(index);
  assert.deepEqual(result.files.map((file) => file.path), ["normal.md"]);
});

test("indexed search normalizes Chinese, decomposed accents and fullwidth input while opening folder ancestors", () => {
  const target = { path: "婚禮/比對資料/01-還沒寄出的喜帖-比對基準.md" };
  const accent = { path: "Cafe\u0301/Resume\u0301.md" };
  const index = createIndex([target, accent]);
  assert.deepEqual(index.search("還沒寄出的喜帖").files, [target]);
  assert.deepEqual(index.search("比對資料").files, [target]);
  assert.deepEqual([...index.search("比對資料").openFolders], ["婚禮", "婚禮/比對資料"]);
  assert.deepEqual(index.search("CAFÉ").files, [accent]);
  assert.deepEqual(index.search("ＲＥＳＵＭÉ").files, [accent]);
  assert.equal(normalize("  ＭＤ\\資料夾  "), "md/資料夾");
  index.append([target, { path: "婚禮/新增.md" }]);
  assert.equal(index.size, 3);
  assert.equal(index.search("婚禮").files.length, 2);
  assert.deepEqual(index.search("婚禮", (file) => file.path.endsWith("新增.md")).files.map((file) => file.path), ["婚禮/新增.md"]);
  index.clear();
  assert.equal(index.search("").files.length, 0);
});

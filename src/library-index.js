"use strict";

const fsp = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const DEFAULT_LIMITS = Object.freeze({
  concurrency: 4,
  sliceMs: 350,
  operationsPerSlice: 2_000,
  maxDirectories: 50_000,
  maxFiles: 50_000,
  maxEntries: 500_000,
  stalledAfterMs: 1_500,
  maxIssues: 40,
});

// A timed-out filesystem operation still occupies its slot. New scans, refreshes
// and windows cannot accumulate an unbounded number of abandoned OS requests.
class IOPool {
  constructor(limit = 4) { this.limit = limit; this.active = 0; this.queue = []; }
  run(operation, cancelled = () => false) {
    return new Promise((resolve, reject) => {
      this.queue.push({ operation, cancelled, resolve, reject });
      this.drain();
    });
  }
  drain() {
    while (this.active < this.limit && this.queue.length) {
      const job = this.queue.shift();
      if (job.cancelled()) { job.resolve(null); continue; }
      this.active += 1;
      Promise.resolve().then(job.operation).then(job.resolve, job.reject).finally(() => {
        this.active -= 1;
        this.drain();
      });
    }
  }
}
const sharedIOPool = new IOPool();

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

class LibraryIndex {
  constructor(root, { isDocument, publicFileRecord, ignoredDirectories = new Set(), limits = {}, io = fsp, pool = sharedIOPool } = {}) {
    this.root = root ? path.resolve(root) : null;
    this.resolvedRoot = null;
    this.id = crypto.randomUUID();
    this.isDocument = isDocument;
    this.publicFileRecord = publicFileRecord;
    this.ignoredDirectories = ignoredDirectories;
    this.limits = { ...DEFAULT_LIMITS, ...limits };
    this.io = io;
    this.pool = pool;
    this.queue = root ? [{ absolute: this.root, relative: "" }] : [];
    this.queueHead = 0;
    this.cursors = new Set();
    this.visited = new Set();
    this.records = new Map();
    this.orderedFiles = [];
    this.issues = [];
    this.issueCount = 0;
    this.entriesSeen = 0;
    this.directoriesScanned = 0;
    this.directoriesScheduled = root ? 1 : 0;
    this.limitReason = null;
    this.disposed = false;
    this.advancePromise = null;
    this.recordVersion = 0;
    this.sortedVersion = -1;
    this.sortedFiles = [];
  }

  addIssue(relative, code) {
    this.issueCount += 1;
    if (this.issues.length < this.limits.maxIssues) this.issues.push({ path: relative || ".", code });
  }

  finish(cursor) {
    cursor.done = true;
    if (!cursor.handle) { this.cursors.delete(cursor); return; }
    cursor.phase = "close";
  }

  async step(cursor) {
    const phase = cursor.phase;
    try {
      if (phase === "resolve") {
        const absolute = await this.pool.run(() => this.io.realpath(cursor.absolute), () => this.disposed);
        if (this.disposed) return;
        if (!this.resolvedRoot) this.resolvedRoot = absolute;
        if (!inside(this.resolvedRoot, absolute)) {
          this.addIssue(cursor.relative, "PATH_OUTSIDE_LIBRARY");
          this.finish(cursor);
        } else if (this.visited.has(absolute)) this.finish(cursor);
        else {
          this.visited.add(absolute);
          cursor.absolute = absolute;
          cursor.phase = "open";
        }
      } else if (phase === "open") {
        const handle = await this.pool.run(() => this.io.opendir(cursor.absolute, { bufferSize: 32 }), () => this.disposed);
        cursor.handle = handle;
        if (this.disposed) return;
        cursor.phase = "read";
      } else if (phase === "read") {
        const entry = await this.pool.run(() => cursor.handle.read(), () => this.disposed);
        if (this.disposed) return;
        if (!entry) {
          this.directoriesScanned += 1;
          this.finish(cursor);
          return;
        }
        this.entriesSeen += 1;
        if (this.entriesSeen > this.limits.maxEntries) { this.limitReason = "entries"; return; }
        if (/\.icloud$/i.test(entry.name)) {
          const originalName = entry.name.replace(/^\./, "").slice(0, -7);
          if (this.isDocument(originalName)) this.addIssue(cursor.relative ? `${cursor.relative}/${originalName}` : originalName, "CLOUD_PLACEHOLDER");
        }
        if (entry.name.startsWith(".") || entry.isSymbolicLink()) return;
        const absolute = path.join(cursor.absolute, entry.name);
        const relative = cursor.relative ? `${cursor.relative}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          if (this.ignoredDirectories.has(entry.name) || /\.app$/i.test(entry.name)) return;
          if (this.directoriesScheduled >= this.limits.maxDirectories) {
            this.limitReason = "directories";
            return;
          }
          this.queue.push({ absolute, relative });
          this.directoriesScheduled += 1;
        } else if (entry.isFile() && this.isDocument(absolute)) {
          cursor.file = { absolute, relative };
          cursor.phase = "stat";
        }
      } else if (phase === "stat") {
        const stat = await this.pool.run(() => this.io.lstat(cursor.file.absolute), () => this.disposed);
        if (this.disposed) return;
        if (stat.isFile() && !stat.isSymbolicLink()) {
          if (this.records.size >= this.limits.maxFiles) this.limitReason = "files";
          else {
            const record = this.publicFileRecord(this.resolvedRoot, cursor.file.absolute, stat);
            if (!this.records.has(record.path)) this.orderedFiles.push(record);
            this.records.set(record.path, record);
            this.recordVersion += 1;
          }
        }
        cursor.file = null;
        cursor.phase = "read";
      } else if (phase === "close") {
        const handle = cursor.handle;
        cursor.handle = null;
        await this.pool.run(() => handle.close());
        this.cursors.delete(cursor);
      }
    } catch (error) {
      if (this.disposed) return;
      const relative = phase === "stat" ? cursor.file.relative : cursor.relative;
      // Missing items during a scan are reported too: an empty result must not
      // silently claim that an unavailable/iCloud folder contains no documents.
      this.addIssue(relative, error.code || "READ_FAILED");
      if (phase === "stat") { cursor.file = null; cursor.phase = "read"; }
      else if (phase === "close") this.cursors.delete(cursor);
      else this.finish(cursor);
    } finally {
      if (this.disposed && cursor.handle) {
        const handle = cursor.handle;
        cursor.handle = null;
        this.pool.run(() => handle.close()).catch(() => {});
      }
    }
  }

  advance({ includeFiles = true } = {}) {
    if (!this.advancePromise) {
      const pending = this.advanceSlice();
      this.advancePromise = pending;
      pending.finally(() => { if (this.advancePromise === pending) this.advancePromise = null; }).catch(() => {});
    }
    return this.advancePromise.then(() => this.snapshot({ includeFiles }));
  }

  async advanceSlice() {
    const deadline = Date.now() + this.limits.sliceMs;
    let operations = 0;
    while (!this.disposed && !this.limitReason && Date.now() < deadline && operations < this.limits.operationsPerSlice) {
      while (this.cursors.size < this.limits.concurrency && this.queueHead < this.queue.length) {
        const item = this.queue[this.queueHead++];
        this.cursors.add({ ...item, phase: "resolve", pending: null, handle: null, done: false });
      }
      // Release consumed queue entries without copying on every directory.
      if (this.queueHead > 1_024 && this.queueHead * 2 > this.queue.length) {
        this.queue = this.queue.slice(this.queueHead);
        this.queueHead = 0;
      }
      if (!this.cursors.size) break;
      for (const cursor of this.cursors) {
        if (cursor.pending || operations >= this.limits.operationsPerSlice) continue;
        operations += 1;
        cursor.startedAt = Date.now();
        cursor.pending = this.step(cursor).finally(() => { cursor.pending = null; });
      }
      const pending = [...this.cursors].map((cursor) => cursor.pending).filter(Boolean);
      if (!pending.length) break;
      let timeout;
      try {
        await Promise.race([...pending, new Promise((resolve) => { timeout = setTimeout(resolve, Math.max(0, deadline - Date.now())); })]);
      } finally { clearTimeout(timeout); }
    }
    if (this.limitReason) this.dispose();
    return this.snapshot({ includeFiles: false });
  }

  snapshot({ includeFiles = true } = {}) {
    if (includeFiles && this.sortedVersion !== this.recordVersion) {
      this.sortedFiles = [...this.records.values()].sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: "base" }));
      this.sortedVersion = this.recordVersion;
    }
    const outstanding = this.queue.length - this.queueHead + this.cursors.size;
    const stalled = [...this.cursors].filter((cursor) => cursor.pending && Date.now() - cursor.startedAt >= this.limits.stalledAfterMs);
    const waiting = outstanding > 0 && stalled.length > 0 && stalled.length === this.cursors.size;
    const hasMore = !this.disposed && !this.limitReason && outstanding > 0;
    const status = this.limitReason ? "limited" : hasMore ? (waiting ? "waiting" : "scanning") : this.issueCount ? "partial" : "complete";
    return {
      ...(includeFiles ? { files: this.sortedFiles } : {}),
      scan: {
        id: this.id, status, complete: status === "complete", hasMore,
        filesFound: this.records.size, directoriesScanned: this.directoriesScanned,
        pendingDirectories: outstanding, entriesSeen: this.entriesSeen,
        issueCount: this.issueCount, issues: [...this.issues],
        stalledPaths: stalled.slice(0, this.limits.maxIssues).map((cursor) => cursor.file?.relative || cursor.relative || "."),
        limitReason: this.limitReason,
        retryAfterMs: waiting ? 2_000 : 500,
      },
    };
  }

  releaseHandles() {
    for (const cursor of this.cursors) {
      if (cursor.pending) continue;
      if (!cursor.handle) { this.cursors.delete(cursor); continue; }
      const handle = cursor.handle;
      cursor.handle = null;
      this.pool.run(() => handle.close()).catch(() => {});
      this.cursors.delete(cursor);
    }
  }

  dispose() {
    this.disposed = true;
    this.queue = [];
    this.queueHead = 0;
    this.releaseHandles();
  }
}

module.exports = { LibraryIndex, IOPool, DEFAULT_LIMITS };

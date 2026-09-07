"use strict";

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { copyDir } = require("builder-util");

const launcherPath = path.resolve(__dirname, "../build/linux-AppRun");

test("Linux AppRun forwards document arguments without adding sandbox exceptions", { skip: process.platform === "win32" }, async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "lumareader-launcher-test-"));
  try {
    const executable = path.join(temporary, "kainnne-lumareader");
    await fs.writeFile(executable, '#!/bin/bash\nprintf "%s\\0" "$@"\n', { mode: 0o755 });
    const argumentsToForward = ["--remote-debugging-port=12345", "/tmp/我的 文件.md", "literal $HOME; $(ignored)"];
    const result = execFileSync("/bin/bash", [launcherPath, ...argumentsToForward], {
      env: { ...process.env, APPDIR: temporary, PATH: "/nonexistent" },
      encoding: "utf8",
    });
    assert.deepEqual(result.split("\0").slice(0, -1), argumentsToForward);
    await fs.rm(executable);
    assert.throws(() => execFileSync("/bin/bash", [launcherPath], { env: { ...process.env, APPDIR: temporary }, stdio: "ignore" }), /failed/);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test("pinned AppImage staging copy replaces its generated launcher with our packaged extra file", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "lumareader-appimage-staging-"));
  try {
    const appDirectory = path.join(temporary, "app");
    const staging = path.join(temporary, "staging");
    await fs.mkdir(appDirectory);
    await fs.mkdir(staging);
    const launcher = await fs.readFile(launcherPath);
    await fs.writeFile(path.join(staging, "AppRun"), "generated launcher");
    await fs.writeFile(path.join(appDirectory, "AppRun"), launcher, { mode: 0o755 });
    // This is the same builder-util operation used after AppImageTarget generates AppRun.
    await copyDir(appDirectory, staging);
    assert.deepEqual(await fs.readFile(path.join(staging, "AppRun")), launcher);
    if (process.platform !== "win32") assert.equal((await fs.stat(path.join(staging, "AppRun"))).mode & 0o777, 0o755);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

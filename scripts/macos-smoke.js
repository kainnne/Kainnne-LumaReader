"use strict";

const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");

const EXPECTED_VERSION = process.env.EXPECTED_VERSION || "1.0.0";
const APP_EXECUTABLE = process.argv[2];

if (process.platform !== "darwin") {
  throw new Error("The macOS release smoke test must run on macOS.");
}
if (!APP_EXECUTABLE) {
  throw new Error("Usage: node scripts/macos-smoke.js <path-to-app-executable>");
}

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close((error) => {
        if (error) reject(error);
        else resolve(address.port);
      });
    });
  });
}

async function requestJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}

async function waitForHealth(origin, child) {
  const deadline = Date.now() + 75_000;
  let lastError = null;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`The packaged app exited early with code ${child.exitCode}.`);
    }
    try {
      return await requestJson(`${origin}/api/health`);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 750));
    }
  }
  throw new Error(`The packaged app did not expose its loopback API: ${lastError?.message || "timeout"}`);
}

async function stopApp(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  const exited = await Promise.race([
    new Promise((resolve) => child.once("exit", () => resolve(true))),
    new Promise((resolve) => setTimeout(() => resolve(false), 5_000)),
  ]);
  if (!exited && child.exitCode === null) child.kill("SIGKILL");
}

async function main() {
  const executable = path.resolve(APP_EXECUTABLE);
  await fs.access(executable);
  const library = await fs.mkdtemp(path.join(os.tmpdir(), "lumareader-macos-smoke-"));
  const smokeText = "# macOS release smoke test\n\nPackaged application API check.\n";
  await fs.writeFile(path.join(library, "smoke.md"), smokeText, "utf8");
  const port = await reservePort();
  const origin = `http://127.0.0.1:${port}`;
  const startedAt = Date.now();
  const child = spawn(executable, [`--library=${library}`, `--reader-port=${port}`], {
    env: { ...process.env, LUMAREADER_LIBRARY_ROOT: library },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });

  try {
    const health = await waitForHealth(origin, child);
    if (!health.ok || health.version !== EXPECTED_VERSION || !health.selected) {
      throw new Error(`Unexpected health response: ${JSON.stringify(health)}`);
    }
    const files = await requestJson(`${origin}/api/files`);
    if (!files.files?.some((file) => file.path === "smoke.md")) {
      throw new Error("The packaged app did not scan the selected Markdown library.");
    }
    const document = await requestJson(`${origin}/api/file?path=smoke.md`);
    if (document.kind !== "markdown" || !document.text?.includes("macOS release smoke test")) {
      throw new Error("The packaged app did not open the Markdown smoke document.");
    }

    const result = {
      label: "Packaged macOS universal application",
      executable,
      version: health.version,
      librarySelected: health.selected,
      markdownScanned: true,
      markdownOpened: true,
      elapsedSeconds: Number(((Date.now() - startedAt) / 1_000).toFixed(2)),
    };
    await fs.mkdir(path.resolve("dist"), { recursive: true });
    await fs.writeFile(path.resolve("dist/macos-smoke-results.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    if (output.trim()) process.stderr.write(`Packaged app output:\n${output}\n`);
    throw error;
  } finally {
    await stopApp(child);
    await fs.rm(library, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message || error}\n`);
  process.exitCode = 1;
});

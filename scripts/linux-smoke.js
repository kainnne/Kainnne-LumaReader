"use strict";

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { runPackagedSmoke } = require("./desktop-smoke");
const { version } = require("../package.json");

const outputDirectory = path.resolve(__dirname, "../dist");
const previousDesktopName = "lumareader-smoke-previous.desktop";
const previousDefaults = `[Default Applications]\ntext/markdown=${previousDesktopName};\ntext/x-markdown=${previousDesktopName};\nx-scheme-handler/kainnne-lumareader=${previousDesktopName};\n`;
const previousDesktop = "[Desktop Entry]\nName=Previous Markdown reader (CI fixture)\nType=Application\nExec=/usr/bin/true %U\nNoDisplay=true\nMimeType=text/markdown;text/x-markdown;x-scheme-handler/kainnne-lumareader;\n";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function checkEnvironment() {
  assert.equal(process.platform, "linux", "Linux smoke tests require a Linux runner.");
  assert.equal(process.env.CI, "true", "Package installation tests belong only in an isolated CI runner.");
  assert.notEqual(process.getuid(), 0, "Launch the app as an ordinary user, never as root.");
  for (const name of ["XDG_CONFIG_HOME", "XDG_DATA_HOME"]) {
    const value = process.env[name];
    assert.ok(value && path.isAbsolute(value) && value.includes("lumareader-linux-"), `${name} must point to an isolated LumaReader CI fixture directory.`);
  }
}

async function verifyDefaults() {
  assert.equal(await fs.readFile(path.join(process.env.XDG_CONFIG_HOME, "mimeapps.list"), "utf8"), previousDefaults);
  assert.equal(await fs.readFile(path.join(process.env.XDG_DATA_HOME, "applications", previousDesktopName), "utf8"), previousDesktop);
  for (const mime of ["text/markdown", "text/x-markdown", "x-scheme-handler/kainnne-lumareader"]) {
    assert.equal(execFileSync("xdg-mime", ["query", "default", mime], { encoding: "utf8", timeout: 10000 }).trim(), previousDesktopName);
  }
}

async function prepareDefaults() {
  await fs.mkdir(process.env.XDG_CONFIG_HOME, { recursive: true });
  await fs.mkdir(path.join(process.env.XDG_DATA_HOME, "applications"), { recursive: true });
  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.writeFile(path.join(process.env.XDG_CONFIG_HOME, "mimeapps.list"), previousDefaults, { flag: "wx" });
  await fs.writeFile(path.join(process.env.XDG_DATA_HOME, "applications", previousDesktopName), previousDesktop, { flag: "wx" });
  await verifyDefaults();
}

async function readProcesses() {
  const processes = new Map();
  for (const name of await fs.readdir("/proc")) {
    if (!/^\d+$/.test(name)) continue;
    try {
      const [status, command, stat] = await Promise.all([
        fs.readFile(`/proc/${name}/status`, "utf8"),
        fs.readFile(`/proc/${name}/cmdline`, "utf8"),
        fs.readFile(`/proc/${name}/stat`, "utf8"),
      ]);
      processes.set(Number(name), {
        pid: Number(name),
        parent: Number(status.match(/^PPid:\s+(\d+)/m)?.[1]),
        status,
        args: command.split("\0").filter(Boolean),
        // comm may contain spaces or parentheses; the final ')' ends that field.
        startTime: stat.slice(stat.lastIndexOf(")") + 2).split(" ")[19],
      });
    } catch (error) {
      if (!["ENOENT", "EACCES", "ESRCH"].includes(error.code)) throw error;
    }
  }
  return processes;
}

function belongsToThisTest(item, processes, ownerPid = process.pid) {
  const seen = new Set();
  for (let parent = item.parent; parent && !seen.has(parent); parent = processes.get(parent)?.parent) {
    if (parent === ownerPid) return true;
    seen.add(parent);
  }
  return false;
}

function hasProcessSwitch(item, name, value = null) {
  const prefix = `--${name}`;
  if (item.args.length !== 1) {
    return item.args.some((argument) => value === null
      ? argument === prefix || argument.startsWith(`${prefix}=`)
      : argument === `${prefix}=${value}`);
  }
  // Chromium setproctitle rewrites argv into one space-separated title. On
  // modern Linux /proc/PID/cmdline then contains "title\0", not a NUL between
  // each argument. Preserve the raw title for executable/ownership checks.
  // https://chromium.googlesource.com/chromium/src/+/refs/tags/138.0.7158.1/base/process/set_process_title_linux_unittest.cc
  const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const switchPattern = value === null
    ? `${escape(prefix)}(?:=[^\\s]*)?`
    : `${escape(prefix)}=${escape(value)}`;
  return new RegExp(`(?:^|\\s)${switchPattern}(?=\\s|$)`).test(item.args[0]);
}

function inspectSandboxProcesses(processes, observed, renderers, ownerPid = process.pid) {
  for (const item of processes.values()) {
    if (!belongsToThisTest(item, processes, ownerPid) || !item.args[0]?.includes("kainnne-lumareader")) continue;
    observed.set(item.pid, item);
    assert.ok(!["no-sandbox", "disable-setuid-sandbox", "disable-seccomp-filter-sandbox"].some((name) => hasProcessSwitch(item, name)), `Sandbox-disabled process: ${JSON.stringify(item.args)}`);
    if (!hasProcessSwitch(item, "type", "renderer")) continue;
    assert.match(item.status, /^Seccomp:\s+2$/m, "The renderer must run with a seccomp filter.");
    assert.match(item.status, /^NoNewPrivs:\s+1$/m, "The renderer must prevent privilege escalation.");
    renderers.set(item.pid, item);
  }
}

async function runWithSandboxChecks(executable, label) {
  const observed = new Map();
  const renderers = new Map();
  let samplingError;
  let sampling = Promise.resolve();
  async function sample() {
    const processes = await readProcesses();
    inspectSandboxProcesses(processes, observed, renderers);
  }
  const timer = setInterval(() => {
    sampling = sampling.then(sample).catch((error) => { samplingError ||= error; });
  }, 400);
  try {
    const result = await runPackagedSmoke(executable, label);
    await sampling;
    if (samplingError || renderers.size === 0) {
      const observations = [...observed.values()].slice(-8).map((item) => ({
        pid: item.pid, parent: item.parent, argumentFields: item.args.length,
        command: item.args.join(" ").slice(0, 400),
        seccomp: item.status.match(/^Seccomp:\s+(\d+)/m)?.[1],
        noNewPrivileges: item.status.match(/^NoNewPrivs:\s+(\d+)/m)?.[1],
      }));
      console.error(`[sandbox] Owned CI process samples: ${JSON.stringify(observations)}`);
    }
    if (samplingError) throw samplingError;
    assert.ok(renderers.size > 0, "No sandboxed renderer process was observed during the UI test.");
    await verifyDefaults();
    return { ...result, operatingSystem: os.release(), displaySession: "Xvfb / X11", rendererSeccompEnabled: true, rendererNoNewPrivileges: true, sandboxedRenderersObserved: renderers.size, defaultAssociationsPreserved: true };
  } finally {
    clearInterval(timer);
    await sampling;
    // Extraction-mode runtimes may outlive their launcher. Only stop processes
    // observed as this test's descendants, verifying PID start time before each signal.
    for (const signal of ["SIGTERM", "SIGKILL"]) {
      const processes = await readProcesses();
      for (const [pid, previous] of observed) {
        if (processes.get(pid)?.startTime === previous.startTime) {
          try { process.kill(pid, signal); } catch (error) { if (error.code !== "ESRCH") throw error; }
        }
      }
      if (signal === "SIGTERM") await delay(500);
    }
  }
}

async function smokeAppImage() {
  const artifact = path.join(outputDirectory, `Kainnne-LumaReader-${version}-Linux-x64.AppImage`);
  await fs.chmod(artifact, 0o755);
  const extracted = await fs.mkdtemp(path.join(os.tmpdir(), "lumareader-appimage-inspect-"));
  try {
    execFileSync(artifact, ["--appimage-extract"], { cwd: extracted, stdio: "ignore", timeout: 60000 });
    const appDirectory = path.join(extracted, "squashfs-root");
    const launcher = await fs.readFile(path.join(appDirectory, "AppRun"), "utf8");
    assert.equal(launcher, await fs.readFile(path.resolve(__dirname, "../build/linux-AppRun"), "utf8"), "AppImage must contain our sandbox-preserving launcher.");
    const desktopPath = path.join(appDirectory, "kainnne-lumareader.desktop");
    const desktop = await fs.readFile(desktopPath, "utf8");
    assert.match(desktop, /^Exec=AppRun %U$/m);
    assert.ok(!desktop.includes("--no-sandbox"));
    execFileSync("desktop-file-validate", [desktopPath], { stdio: "inherit", timeout: 10000 });
    const previousMode = process.env.APPIMAGE_EXTRACT_AND_RUN;
    process.env.APPIMAGE_EXTRACT_AND_RUN = "1";
    let result;
    try {
      result = await runWithSandboxChecks(artifact, "Linux AppImage (actual package, extraction mode)");
    } finally {
      if (previousMode === undefined) delete process.env.APPIMAGE_EXTRACT_AND_RUN;
      else process.env.APPIMAGE_EXTRACT_AND_RUN = previousMode;
    }
    result.appImageLauncherVerified = true;
    result.appImageMode = "extract-and-run";
    await fs.writeFile(path.join(outputDirectory, "linux-appimage-smoke-results.json"), JSON.stringify(result, null, 2) + "\n");
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await fs.rm(extracted, { recursive: true, force: true });
  }
}

async function smokeInstalled() {
  const metadata = execFileSync("dpkg-query", ["-W", "-f=${Version}\n${Architecture}\n${Status}", "kainnne-lumareader"], { encoding: "utf8", timeout: 10000 }).trim().split("\n");
  assert.deepEqual(metadata, [version, "amd64", "install ok installed"]);
  const executable = await fs.realpath("/usr/bin/kainnne-lumareader");
  assert.ok(executable.startsWith("/opt/") && executable.endsWith("/kainnne-lumareader"));
  const desktopPath = "/usr/share/applications/kainnne-lumareader.desktop";
  const desktop = await fs.readFile(desktopPath, "utf8");
  assert.ok(!desktop.includes("--no-sandbox"));
  assert.match(desktop, /^MimeType=.*text\/markdown/m);
  execFileSync("desktop-file-validate", [desktopPath], { stdio: "inherit", timeout: 10000 });
  await verifyDefaults();
  const result = await runWithSandboxChecks(executable, "Linux installed Debian package");
  await fs.writeFile(path.join(outputDirectory, "linux-installed-smoke-results.json"), JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result, null, 2));
}

async function main() {
  checkEnvironment();
  switch (process.argv[2]) {
    case "prepare": await prepareDefaults(); break;
    case "appimage": await smokeAppImage(); break;
    case "installed": await smokeInstalled(); break;
    case "verify-defaults":
      await verifyDefaults();
      await fs.writeFile(path.join(outputDirectory, "linux-defaults-results.json"), JSON.stringify({ version, installAndRemovalPreservedExistingDefaults: true }, null, 2) + "\n");
      break;
    default: throw new Error("Use prepare, appimage, installed, or verify-defaults.");
  }
}

if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 1; });
module.exports = { hasProcessSwitch, belongsToThisTest, inspectSandboxProcesses };

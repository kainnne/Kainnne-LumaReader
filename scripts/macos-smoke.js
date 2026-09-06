"use strict";

const { execFileSync } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");

const APP_EXECUTABLE = process.argv[2];

function appBundleForExecutable(executable) {
  const appPath = path.dirname(path.dirname(path.dirname(path.resolve(executable))));
  if (path.extname(appPath).toLowerCase() !== ".app") {
    throw new Error(`The smoke-test executable is not inside a macOS app bundle: ${executable}`);
  }
  return appPath;
}

function verifyCodeSignature(executable, verify = execFileSync) {
  const appPath = appBundleForExecutable(executable);
  try {
    verify("/usr/bin/codesign", ["--verify", "--deep", "--strict", "--verbose=2", appPath], {
      encoding: "utf8",
      stdio: "pipe",
    });
  } catch (error) {
    const detail = [error?.stdout, error?.stderr]
      .filter(Boolean)
      .map((value) => String(value).trim())
      .filter(Boolean)
      .join("\n");
    throw new Error(
      `Refusing to launch a macOS package with an invalid code signature: ${appPath}${detail ? `\n${detail}` : ""}`,
    );
  }
  return appPath;
}

async function main() {
  if (process.platform !== "darwin") throw new Error("The macOS smoke test must run on macOS.");
  if (!APP_EXECUTABLE) throw new Error("Provide the packaged app executable.");
  verifyCodeSignature(APP_EXECUTABLE);
  const { runPackagedSmoke } = require("./desktop-smoke");
  const result = await runPackagedSmoke(path.resolve(APP_EXECUTABLE), "Signed and notarized macOS universal application");
  await fs.mkdir(path.resolve("dist"), { recursive: true });
  await fs.writeFile(path.resolve("dist/macos-smoke-results.json"), JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message || error}\n`);
    process.exitCode = 1;
  });
}

module.exports = { appBundleForExecutable, verifyCodeSignature };

"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const packageMetadata = require("../package.json");
const { appBundleForExecutable, verifyCodeSignature } = require("../scripts/macos-smoke");

const APP = "/private/tmp/Luma Test.app";
const EXECUTABLE = `${APP}/Contents/MacOS/Luma Test`;
const macTest = process.platform === "darwin" ? test : test.skip;

test("keeps Chromium cookie encryption disabled to avoid macOS Safe Storage prompts", () => {
  assert.equal(packageMetadata.build.electronFuses.enableCookieEncryption, false);
});

macTest("resolves the containing app bundle from its executable", () => {
  assert.equal(appBundleForExecutable(EXECUTABLE), APP);
  assert.throws(
    () => appBundleForExecutable("/private/tmp/Luma Test"),
    /not inside a macOS app bundle/,
  );
});

macTest("performs strict deep signature verification before launch", () => {
  let invocation;
  const appPath = verifyCodeSignature(EXECUTABLE, (...args) => { invocation = args; });
  assert.equal(appPath, APP);
  assert.deepEqual(invocation, [
    "/usr/bin/codesign",
    ["--verify", "--deep", "--strict", "--verbose=2", APP],
    { encoding: "utf8", stdio: "pipe" },
  ]);
});

macTest("rejects an invalid package without launching it", () => {
  assert.throws(
    () => verifyCodeSignature(EXECUTABLE, () => {
      const error = new Error("codesign failed");
      error.stderr = `${APP}: code object is not signed at all`;
      throw error;
    }),
    /Refusing to launch a macOS package with an invalid code signature.*code object is not signed at all/s,
  );
});

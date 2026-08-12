"use strict";

const { execFileSync } = require("node:child_process");
const path = require("node:path");

const UNUSED_MAC_PERMISSION_KEYS = [
  "NSAudioCaptureUsageDescription",
  "NSBluetoothAlwaysUsageDescription",
  "NSBluetoothPeripheralUsageDescription",
  "NSCameraUsageDescription",
  "NSMicrophoneUsageDescription",
];

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;
  const productName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${productName}.app`);
  const plistPath = path.join(appPath, "Contents", "Info.plist");
  for (const key of UNUSED_MAC_PERMISSION_KEYS) {
    try {
      execFileSync("/usr/bin/plutil", ["-remove", key, plistPath], { stdio: "ignore" });
    } catch {
      // The key is optional and may be absent in future Electron releases.
    }
  }

  // Finder/iCloud metadata can survive framework extraction and makes Apple's
  // codesign reject an otherwise valid bundle. Remove extended attributes only
  // from this newly generated app before electron-builder signs it.
  execFileSync("/usr/bin/xattr", ["-cr", appPath]);
  execFileSync("/usr/bin/xattr", ["-c", appPath]);
};

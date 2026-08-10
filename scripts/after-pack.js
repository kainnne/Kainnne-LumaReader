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
  const plistPath = path.join(context.appOutDir, `${productName}.app`, "Contents", "Info.plist");
  for (const key of UNUSED_MAC_PERMISSION_KEYS) {
    try {
      execFileSync("/usr/bin/plutil", ["-remove", key, plistPath], { stdio: "ignore" });
    } catch {
      // The key is optional and may be absent in future Electron releases.
    }
  }
};

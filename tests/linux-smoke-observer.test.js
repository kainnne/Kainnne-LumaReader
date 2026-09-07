"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { belongsToThisTest, hasProcessSwitch, inspectSandboxProcesses } = require("../scripts/linux-smoke");

const ownerPid = 100;
const binary = "/tmp/appimage extracted/kainnne-lumareader";
const record = (pid, parent, cmdline, { seccomp = 2, noNewPrivileges = 1 } = {}) => ({
  pid, parent, startTime: String(pid * 100),
  args: cmdline.split("\0").filter(Boolean),
  status: `Name:\tkainnne-lumarea\nPPid:\t${parent}\nSeccomp:\t${seccomp}\nNoNewPrivs:\t${noNewPrivileges}\n`,
});
const tree = (rendererCmdline, options) => new Map([
  // AppImage's runtime and Chromium's intermediate zygotes are part of the
  // ancestry chain even when they are not themselves sandboxed renderers.
  [101, record(101, ownerPid, "/tmp/Kainnne-LumaReader.AppImage\0")],
  [102, record(102, 101, `${binary}\0--remote-debugging-port=12345\0`, { seccomp: 0, noNewPrivileges: 0 })],
  [103, record(103, 102, `${binary}\0--type=zygote\0`, { seccomp: 0, noNewPrivileges: 0 })],
  [104, record(104, 103, `${binary}\0--type=zygote\0`, { seccomp: 0, noNewPrivileges: 0 })],
  [105, record(105, 104, rendererCmdline, options)],
]);

for (const format of ["NUL argv", "Chromium process title"]) {
  const formatCommand = (switches) => format === "NUL argv"
    ? `${binary}\0${switches.join("\0")}\0`
    : `${binary} ${switches.join(" ")}\0`;

  test(`sandbox observer identifies a renderer through the AppImage/zygote tree using ${format}`, () => {
    const processes = tree(formatCommand(["--type=renderer", "--enable-sandbox", "--renderer-client-id=4"]));
    const observed = new Map(), renderers = new Map();
    inspectSandboxProcesses(processes, observed, renderers, ownerPid);
    assert.deepEqual([...renderers.keys()], [105]);
    assert.equal(observed.has(102), true);
    assert.equal(observed.has(103), true);
    assert.equal(observed.has(104), true);
    assert.equal(observed.has(101), false);
  });

  test(`sandbox observer rejects every prohibited sandbox exception in ${format}`, () => {
    for (const name of ["no-sandbox", "disable-setuid-sandbox", "disable-seccomp-filter-sandbox"]) {
      for (const suffix of ["", "=true", "=false"]) {
        const processes = tree(formatCommand(["--type=renderer", `--${name}${suffix}`]));
        assert.throws(() => inspectSandboxProcesses(processes, new Map(), new Map(), ownerPid), /Sandbox-disabled process/);
      }
    }
  });

  test(`sandbox observer requires kernel protections for a renderer using ${format}`, () => {
    const command = formatCommand(["--type=renderer"]);
    assert.throws(() => inspectSandboxProcesses(tree(command, { seccomp: 0 }), new Map(), new Map(), ownerPid), /seccomp filter/);
    assert.throws(() => inspectSandboxProcesses(tree(command, { noNewPrivileges: 0 }), new Map(), new Map(), ownerPid), /prevent privilege escalation/);
  });
}

test("switch matching does not confuse prefixes, other process types, or literal argv values", () => {
  const values = [
    `${binary}\0--type=renderer-helper\0`,
    `${binary} --type=renderer-helper\0`,
    `${binary} --renderer-client-id=4 --type=zygote\0`,
    `${binary}\0literal --type=renderer\0`,
    `${binary} --title=--type=renderer\0`,
  ];
  for (const value of values) {
    assert.equal(hasProcessSwitch(record(1, 0, value), "type", "renderer"), false, value);
  }
  for (const value of [`${binary}\0--no-sandboxing\0`, `${binary} --no-sandboxing\0`]) {
    assert.equal(hasProcessSwitch(record(1, 0, value), "no-sandbox"), false);
  }
});

test("unrelated renderer sessions cannot satisfy or fail this test's sandbox checks", () => {
  const processes = tree(`${binary}\0--type=utility\0`);
  processes.set(999, record(999, 1, `${binary} --type=renderer --no-sandbox\0`, { seccomp: 0, noNewPrivileges: 0 }));
  const observed = new Map(), renderers = new Map();
  inspectSandboxProcesses(processes, observed, renderers, ownerPid);
  assert.equal(observed.has(999), false);
  assert.equal(renderers.size, 0);
  assert.equal(belongsToThisTest(processes.get(999), processes, ownerPid), false);
});

test("incomplete or cyclic process snapshots never establish ownership", () => {
  const missing = record(105, 104, `${binary} --type=renderer\0`);
  assert.equal(belongsToThisTest(missing, new Map([[105, missing]]), ownerPid), false);
  const first = record(104, 105, `${binary}\0`);
  assert.equal(belongsToThisTest(missing, new Map([[104, first], [105, missing]]), ownerPid), false);
});

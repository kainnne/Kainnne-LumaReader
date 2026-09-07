const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const test = require("node:test");

test("Linux counter migration preserves all existing counts and timestamps", (t) => {
  const database = new DatabaseSync(":memory:");
  t.after(() => database.close());
  const migrations = path.join(__dirname, "../cloudflare/lumareader-share/migrations");
  database.exec(fs.readFileSync(path.join(migrations, "0001_download_counts.sql"), "utf8"));
  database.exec("UPDATE download_counts SET count = 41, updated_at = '2026-09-06 10:00:00' WHERE platform = 'macos'");
  database.exec("UPDATE download_counts SET count = 23, updated_at = '2026-09-06 11:00:00' WHERE platform = 'windows'");
  database.exec("BEGIN");
  database.exec(fs.readFileSync(path.join(migrations, "0002_linux_download_counts.sql"), "utf8"));
  database.exec("COMMIT");
  const rows = database.prepare("SELECT * FROM download_counts ORDER BY platform").all().map((row) => ({ ...row }));
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], { platform: "linux", count: 0, updated_at: rows[0].updated_at });
  assert.deepEqual(rows[1], { platform: "macos", count: 41, updated_at: "2026-09-06 10:00:00" });
  assert.deepEqual(rows[2], { platform: "windows", count: 23, updated_at: "2026-09-06 11:00:00" });
  database.prepare("UPDATE download_counts SET count = count + 1 WHERE platform = ?").run("linux");
  assert.equal(database.prepare("SELECT count FROM download_counts WHERE platform = 'linux'").get().count, 1);
  assert.throws(() => database.exec("INSERT INTO download_counts (platform) VALUES ('other')"), /CHECK constraint failed/);
});

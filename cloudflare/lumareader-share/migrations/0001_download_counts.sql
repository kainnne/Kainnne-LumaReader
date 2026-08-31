CREATE TABLE IF NOT EXISTS download_counts (
  platform TEXT PRIMARY KEY CHECK (platform IN ('macos', 'windows')),
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO download_counts (platform, count) VALUES ('macos', 0);
INSERT OR IGNORE INTO download_counts (platform, count) VALUES ('windows', 0);

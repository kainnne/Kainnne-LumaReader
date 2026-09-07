-- Preserve existing platform totals while extending the CHECK constraint.
-- D1 applies each migration atomically.
ALTER TABLE download_counts RENAME TO download_counts_before_linux;

CREATE TABLE download_counts (
  platform TEXT PRIMARY KEY CHECK (platform IN ('macos', 'windows', 'linux')),
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO download_counts (platform, count, updated_at)
SELECT platform, count, updated_at FROM download_counts_before_linux;
INSERT OR IGNORE INTO download_counts (platform, count) VALUES ('linux', 0);

DROP TABLE download_counts_before_linux;

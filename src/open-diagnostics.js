'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');

// Bounded, local diagnostics: no document names, paths, content, URLs or tokens.
function createOpenDiagnostics(directory, metadata = {}) {
  const destination = path.join(directory, 'open-errors.jsonl');
  let pending = Promise.resolve();
  const record = event => {
    const row = {
      time: new Date().toISOString(), version: metadata.version,
      platform: metadata.platform, electron: metadata.electron,
      kind: ['request', 'page', 'open-document', 'open-window'].includes(event.kind) ? event.kind : 'unknown',
      code: typeof event.code === 'number' ? event.code : /^[A-Z0-9_-]{1,64}$/.test(String(event.code || '')) ? event.code : 'UNKNOWN',
      ...(typeof event.headersSent === 'boolean' ? {headersSent: event.headersSent} : {}),
    };
    pending = pending.then(async () => {
      await fs.mkdir(directory, {recursive: true, mode: 0o700});
      let previous = '';
      try { if ((await fs.stat(destination)).size <= 65536) previous = await fs.readFile(destination, 'utf8'); } catch {}
      const lines = previous.trim().split('\n').filter(Boolean).slice(-99);
      lines.push(JSON.stringify(row));
      await fs.writeFile(destination + '.tmp', lines.join('\n') + '\n', {mode: 0o600});
      await fs.rename(destination + '.tmp', destination);
    }).catch(() => {}); // A full/unavailable disk must not break document opening.
    return pending;
  };
  record.flush = () => pending;
  return record;
}
module.exports = {createOpenDiagnostics};

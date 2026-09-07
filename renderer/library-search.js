(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LumaLibrarySearch = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  "use strict";

  function normalize(value) {
    return String(value || "").normalize("NFKC").toLowerCase().replace(/\\/g, "/").trim();
  }

  function ancestors(filePath, target) {
    let offset = filePath.indexOf("/");
    while (offset !== -1) {
      target.add(filePath.slice(0, offset));
      offset = filePath.indexOf("/", offset + 1);
    }
  }

  function createIndex(initialFiles = []) {
    const records = new Map();
    let version = 0;
    let previous = null;
    function append(files) {
      for (const file of files || []) {
        if (!file || typeof file.path !== "string") continue;
        records.set(file.path, { file, key: normalize(file.path), name: normalize(file.name || file.path.split("/").pop()) });
      }
      if (files?.length) { version += 1; previous = null; }
      return api;
    }
    function clear() { records.clear(); previous = null; version += 1; return api; }
    function search(query, predicate = null) {
      const key = normalize(query);
      const cacheKey = `${version}:${key}`;
      if (!predicate && previous?.key === cacheKey) return previous.result;
      const files = [], openFolders = new Set();
      for (const record of records.values()) {
        if ((predicate && !predicate(record.file)) || (key && !record.key.includes(key) && !record.name.includes(key))) continue;
        files.push(record.file);
        if (key) ancestors(record.file.path, openFolders);
      }
      const result = { files, openFolders };
      if (!predicate) previous = { key: cacheKey, result };
      return result;
    }
    const api = { append, add: append, clear, search, get size() { return records.size; } };
    append(initialFiles);
    return api;
  }
  return { normalize, createIndex };
});

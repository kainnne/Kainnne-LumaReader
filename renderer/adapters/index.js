(function (root, factory) {
  const isNode = typeof module === "object" && module.exports;
  const modules = isNode
    ? { core: require("./core"), plain: require("./plain-text") }
    : { core: root.LumaDocumentAdapters, plain: root.LumaDocumentAdapters };
  const api = factory(modules);
  if (isNode) module.exports = api;
  root.LumaDocumentAdapters = Object.assign(root.LumaDocumentAdapters || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : this, function (modules) {
  "use strict";

  const { core, plain } = modules;

  const FORMAT_CATALOG = Object.freeze({
    text: Object.freeze([".txt", ".log"]),
  });

  function createAdapterFor(source, options = {}) {
    const adapter = new plain.PlainTextAdapter(options.PlainTextAdapter || options.shared || {});
    if (adapter.canOpen(core.normalizeSource(source))) return adapter;
    adapter.dispose();
    return null;
  }

  function createDefaultRegistry(options = {}) {
    return {
      createFor(source) { return createAdapterFor(source, options); },
      formats: FORMAT_CATALOG,
    };
  }

  return { FORMAT_CATALOG, createAdapterFor, createDefaultRegistry };
});

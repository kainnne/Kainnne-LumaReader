var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var annotation_contract_exports = {};
__export(annotation_contract_exports, {
  annotationCapabilities: () => annotationCapabilities,
  cleanActions: () => cleanActions,
  cleanItem: () => cleanItem,
  cleanSnapshot: () => cleanSnapshot,
  fingerprint: () => fingerprint,
  treeFingerprint: () => treeFingerprint
});
module.exports = __toCommonJS(annotation_contract_exports);
const annotationCapabilities = Object.freeze({ version: 1, modes: ["direct"], sourceOffsets: "UTF-16", sourceMapping: "exact-or-unavailable", maxAnnotations: 200, maxSelection: 1e4 });
function cleanActions(actions) {
  if (actions === void 0) return null;
  if (!Array.isArray(actions) || actions.length > 5) throw new TypeError("At most five selection actions");
  const ids = /* @__PURE__ */ new Set();
  return actions.map((a) => {
    if (!a || !/^[-\w]{1,40}$/.test(a.id) || ids.has(a.id) || typeof a.label !== "string" || !a.label.trim() || a.label.length > 32) throw new TypeError("Invalid selection action");
    ids.add(a.id);
    return { id: a.id, label: a.label, icon: ["image", "highlight", "comment"].includes(a.icon) ? a.icon : "comment" };
  });
}
function cleanItem(value) {
  if (!value || typeof value !== "object") throw new TypeError("Invalid annotation");
  const item = { id: String(value.id || ""), kind: value.kind, label: String(value.label || ""), body: String(value.body || "") };
  if (!/^[-\w]{1,100}$/.test(item.id) || !["highlight", "comment", "attachment"].includes(item.kind) || item.label.length > 120 || item.body.length > 4e3) throw new TypeError("Invalid annotation");
  if (value.asset !== void 0) {
    const asset = value.asset;
    if (!asset || typeof asset.id !== "string" || !asset.id || asset.id.length > 200) throw new TypeError("Provide an asset ID");
    item.asset = { id: asset.id, ...asset.local === true ? { local: true } : {} };
    if (asset.url) {
      const u = new URL(asset.url);
      if (u.protocol !== "https:" || u.username || u.password || u.href.length > 2e3) throw new TypeError("Asset URL must be HTTPS without credentials");
      item.asset.url = u.href;
    }
  }
  if (value.data !== void 0) {
    const raw = JSON.stringify(value.data);
    if (raw.length > 4096) throw new TypeError("Annotation data too large");
    item.data = JSON.parse(raw);
  }
  return item;
}
function cleanSnapshot(value) {
  if (value === void 0 || value === null) return null;
  if (value.schemaVersion !== 1 || typeof value.fingerprint !== "string" || value.fingerprint.length > 100 || !Array.isArray(value.items) || value.items.length > 200) throw new TypeError("Invalid annotation snapshot");
  const ids = /* @__PURE__ */ new Set();
  const items = value.items.map((v) => {
    const item = cleanItem(v), a = v.anchor;
    if (ids.has(item.id) || !a || !Number.isSafeInteger(a.from) || !Number.isSafeInteger(a.to) || a.from < 0 || a.to < a.from || typeof a.quote !== "string" || a.quote.length > 1e4 || (a.currentQuote?.length || 0) > 1e4 || !["active", "needsReview", "orphaned"].includes(v.status)) throw new TypeError("Invalid annotation anchor");
    ids.add(item.id);
    return { ...item, anchor: { from: a.from, to: a.to, quote: a.quote, currentQuote: typeof a.currentQuote === "string" ? a.currentQuote : a.quote }, status: v.status };
  });
  if (JSON.stringify(items).length > 1024 * 1024) throw new TypeError("Annotations exceed 1 MiB");
  return { schemaVersion: 1, fingerprint: value.fingerprint, treeFingerprint: typeof value.treeFingerprint === "string" ? value.treeFingerprint.slice(0, 100) : null, items };
}
function fingerprint(text) {
  let a = 2166136261, b = 2654435769;
  for (let i = 0; i < text.length; i++) {
    const n = text.charCodeAt(i);
    a = Math.imul(a ^ n, 16777619);
    b = Math.imul(b ^ n, 2246822507);
  }
  return `v1:${text.length}:${(a >>> 0).toString(16)}:${(b >>> 0).toString(16)}`;
}
function treeFingerprint(doc) {
  return fingerprint(JSON.stringify(doc.toJSON(), (key, value) => key === "lumaId" || key === "lumaAnnotations" ? void 0 : value));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  annotationCapabilities,
  cleanActions,
  cleanItem,
  cleanSnapshot,
  fingerprint,
  treeFingerprint
});

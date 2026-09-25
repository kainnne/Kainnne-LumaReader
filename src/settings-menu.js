"use strict";

// Renderer supplies the existing localized choices; no second palette/label registry.
const VISIBILITY_KEYS = new Set(["language", "readingMode", "source", "media", "textSize", "exportPdf", "settings"]);
const cleanLabel = value => typeof value === "string" ? value.replace(/[\u0000-\u001f]/g, "").slice(0, 120) : "";
function normalizeSettingsMenu(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const choices = (items, allowed) => (Array.isArray(items) ? items : []).slice(0, 32)
    .filter(item => item && typeof item.id === "string" && /^[a-zA-Z0-9-]+$/.test(item.id) && item.id.length <= 48 && (!allowed || allowed.has(item.id)) && cleanLabel(item.label))
    .map(item => ({ id: item.id, label: cleanLabel(item.label), checked: item.checked === true }));
  const labels = {};
  for (const key of ["open", "visibility", "theme", "palette", "language", "restore"]) labels[key] = cleanLabel(value.labels?.[key]) || key;
  return { labels, visibility: choices(value.visibility, VISIBILITY_KEYS), themes: choices(value.themes, new Set(["light", "dark"])), palettes: choices(value.palettes), languages: choices(value.languages) };
}
function settingsMenuTemplate(model, send) {
  if (!model) return { label: "Settings", submenu: [{ label: "Open Settings…", accelerator: "CmdOrCtrl+,", enabled: false }] };
  const group = (label, items, type, command) => ({ label, submenu: items.map(item => ({
    label: item.label, type, checked: item.checked,
    click: menuItem => send({ type: command, value: item.id, ...(type === "checkbox" ? { checked: menuItem.checked } : {}) }),
  })) });
  return { label: "Settings", submenu: [
    { label: model.labels.open, accelerator: "CmdOrCtrl+,", click: () => send({ type: "open" }) },
    { type: "separator" },
    group(model.labels.visibility, model.visibility, "checkbox", "visibility"),
    group(model.labels.theme, model.themes, "radio", "theme"),
    group(model.labels.palette, model.palettes, "radio", "palette"),
    group(model.labels.language, model.languages, "radio", "language"),
    { type: "separator" },
    { label: model.labels.restore, click: () => send({ type: "restore" }) },
  ] };
}
module.exports = { normalizeSettingsMenu, settingsMenuTemplate };

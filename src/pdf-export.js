"use strict";

function normalizeFooterText(value) {
  return typeof value === "string" ? value.replace(/[\x00-\x1f\x7f]/g, " ").trim().slice(0, 120) : "LumaReader";
}
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, char => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"})[char]);
}
function pdfOptions(value, { includeFooter = true, pageSize = "A4", colorFrame = false } = {}) {
  const text = normalizeFooterText(value);
  return {
    printBackground: true, preferCSSPageSize: true, pageSize: pageSize === "Letter" ? "Letter" : "A4",
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    displayHeaderFooter: includeFooter && Boolean(text), headerTemplate: "<span></span>",
    footerTemplate: `<div style="box-sizing:border-box;width:100%;padding:0 10mm;text-align:right;color:#8b8b8b;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-family:Arial,sans-serif;font-size:8px;font-weight:400;line-height:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transform:translateY(${colorFrame ? 11 : 5}px);">${escapeHtml(text)}</div>`,
  };
}
function normalizePdfLayout(value = {}) {
  return {
    pageSize: value.pageSize === "Letter" ? "Letter" : "A4",
    fontSize: Math.max(12, Math.min(22, Number(value.fontSize) || 18)),
    inset: [6, 10, 14].includes(Number(value.inset)) ? Number(value.inset) : 6,
  };
}
module.exports = { normalizeFooterText, pdfOptions, normalizePdfLayout };

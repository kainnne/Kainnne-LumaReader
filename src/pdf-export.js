"use strict";

function normalizeFooterText(value) {
  return typeof value === "string" ? value.replace(/[\x00-\x1f\x7f]/g, " ").trim().slice(0, 120) : "LumaReader";
}
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, char => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"})[char]);
}
function pdfOptions(value, { includeFooter = true } = {}) {
  const text = normalizeFooterText(value);
  return {
    printBackground: true, preferCSSPageSize: true, pageSize: "A4",
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    displayHeaderFooter: includeFooter && Boolean(text), headerTemplate: "<span></span>",
    footerTemplate: `<div style="box-sizing:border-box;width:100%;padding:0 10mm;text-align:right;color:#817982;font-family:Arial,sans-serif;font-size:8px;font-weight:500;line-height:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transform:translateY(5px);">${escapeHtml(text)}</div>`,
  };
}
module.exports = { normalizeFooterText, pdfOptions };

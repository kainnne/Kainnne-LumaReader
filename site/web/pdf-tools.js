(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LumaPdfTools = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const marker = "<!-- lumareader:pagebreak -->";
  function install(marked) {
    marked.use({ extensions: [{
      name: "lumaPageBreak", level: "block",
      start(source) { const match = /^ {0,3}<!-- lumareader:pagebreak -->[ \t]*(?:\r?\n|$)/m.exec(source); return match?.index; },
      tokenizer(source) {
        const match = /^ {0,3}<!-- lumareader:pagebreak -->[ \t]*(?:\r?\n|$)/.exec(source);
        if (match) return { type: "lumaPageBreak", raw: match[0] };
      },
      renderer() { return '<div class="luma-page-break" role="separator"></div>\n'; }
    }] });
  }
  function prepare(root, label) {
    // Only top-level markers between content blocks create a new printed page.
    let hasContent = false;
    for (const child of [...root.children]) {
      if (!child.classList.contains("luma-page-break")) { hasContent = true; continue; }
      const next = child.nextElementSibling;
      if (!hasContent || !next || next.classList.contains("luma-page-break")) { child.remove(); continue; }
      child.textContent = label;
      child.setAttribute("aria-label", label);
      next.classList.add("luma-start-page");
    }
    root.querySelectorAll(":scope > :not(.luma-page-break) .luma-page-break").forEach(node => node.remove());
  }
  return { marker, install, prepare };
});

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LumaPdfTools = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const marker = "<!-- lumareader:pagebreak -->";
  // Physical dimensions in millimetres, stored in portrait order.
  const sizes = { A4: [210, 297], Letter: [215.9, 279.4], "16:9": [180, 320], "4:3": [210, 280] };
  function normalizeLayout(value = {}) {
    const pageSize = Object.hasOwn(sizes, value.pageSize) ? value.pageSize : "A4";
    const orientation = ["portrait", "landscape"].includes(value.orientation) ? value.orientation :
      (["16:9", "4:3"].includes(pageSize) ? "landscape" : "portrait");
    return { pageSize, orientation, fontSize: Math.max(8, Math.min(22, Number(value.fontSize) || 18)),
      inset: [6, 10, 14].includes(Number(value.inset)) ? Number(value.inset) : 6 };
  }
  function pageDimensions(value) {
    const {pageSize, orientation} = normalizeLayout(value);
    const [short, long] = sizes[pageSize];
    return orientation === "landscape" ? {width: long, height: short} : {width: short, height: long};
  }
  function pageArea(value) {
    const {width, height} = pageDimensions(value), {inset} = normalizeLayout(value);
    return {width: width - 8 - inset * 2, height: height - 4 - (value?.colorFrame ? 7 : 11) - inset * 2};
  }
  function pageStyle(value) {
    const {width, height} = pageDimensions(value), {inset} = normalizeLayout(value);
    const bottom = value?.colorFrame ? 7 : 11;
    let background = 'none';
    if (value?.colorFrame) {
      const accent = /^#[0-9a-f]{6}$/i.test(value.accent || '') ? value.accent : '#c54f7e';
      const mix = amount => '#' + [1,3,5].map(i => Math.round(parseInt(accent.slice(i,i+2),16)*amount+255*(1-amount)).toString(16).padStart(2,'0')).join('');
      // Paint the decoration on the page, independent of content fragmentation.
      // Physical SVG dimensions avoid Chromium's percentage-background sizing.
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${mix(.1)}"/><rect x="4.35" y="4.35" width="${width-8.7}" height="${height-4-bottom-.7}" rx="5.15" fill="white" stroke="${mix(.44)}" stroke-width=".7"/></svg>`;
      background = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    }
    return `@media print { @page { size: ${width}mm ${height}mm; margin: 4mm 4mm ${bottom}mm; padding: ${inset}mm; background-image: ${background}; background-position: -4mm -4mm; background-size: ${width}mm ${height}mm; background-repeat: no-repeat; } :root { --pdf-content-height: ${pageArea(value).height}mm; } }`;
  }
  function clearImageLayout(root) {
    root.querySelectorAll('img').forEach(img => img.style.removeProperty('--pdf-image-height'));
    root.querySelectorAll('[data-pdf-image-caption]').forEach(node => node.removeAttribute('data-pdf-image-caption'));
  }
  function prepareImageLayout(root, options) {
    clearImageLayout(root);
    const images = [...root.querySelectorAll('img')];
    if (!images.length) return;
    const doc = root.ownerDocument, area = pageArea(options), pxPerMm = 96 / 25.4;
    const height = area.height * pxPerMm, {inset} = normalizeLayout(options);
    // Measure with the same stylesheet's print rules, at the physical paper width.
    // A detached shadow tree prevents duplicate IDs, screen reflow and selection loss.
    const host = doc.createElement('div');
    host.style.cssText = 'position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none;contain:layout style;';
    host.style.setProperty('--pdf-content-height', `${area.height}mm`);
    const shadow = host.attachShadow({mode:'closed'}), style = doc.createElement('style');
    const sheet = [...doc.styleSheets].find(sheet => sheet.href && new URL(sheet.href).pathname.endsWith('/styles.css'));
    if (!sheet) return; // CSS still provides a safe single-page size limit.
    style.textContent = [...sheet.cssRules].map(rule => {
      if (rule.type !== 4) return rule.cssText;
      if (rule.conditionText === 'print') return [...rule.cssRules].map(r => r.cssText).join('\n');
      return rule.cssText;
    }).join('\n');
    const copy = root.cloneNode(true);
    copy.style.cssText = `display:block!important;box-sizing:content-box!important;width:${area.width}mm!important;padding:${inset}mm!important;margin:0!important;height:auto!important;max-height:none!important;min-height:0!important;overflow:visible!important;columns:auto!important;`;
    shadow.append(style,copy);doc.body.append(host);
    try {
      const copies = [...copy.querySelectorAll('img')], heading = node => node?.matches('h1,h2,h3,h4,h5,h6');
      // Establish intrinsic ratios in one batch before measuring any geometry.
      copies.forEach((img,index) => { img.width=images[index].naturalWidth; img.height=images[index].naturalHeight; });
      const top = copy.getBoundingClientRect().top + inset * pxPerMm;
      images.forEach((img,index) => {
        const measured = copies[index];
        if (!img.naturalWidth || !img.naturalHeight) return;
        let block = measured;
        while (block.parentElement && block.parentElement !== copy) block = block.parentElement;
        const imageOnly = block.matches('p') && !block.textContent.trim() && block.querySelectorAll('img').length === 1;
        let start = block;
        if (imageOnly) while (heading(start.previousElementSibling)) start = start.previousElementSibling;
        const computed = doc.defaultView.getComputedStyle(block), rect = measured.getBoundingClientRect();
        const tail = (parseFloat(computed.marginBottom) || 0) + 2 * pxPerMm;
        const headingSpace = imageOnly ? Math.max(0, rect.top - start.getBoundingClientRect().top) : 0;
        const next = block.nextElementSibling;
        let captionSpace = 0;
        if (imageOnly && next?.matches('p') && !next.querySelector('img') && next.textContent.trim()) {
          const css = doc.defaultView.getComputedStyle(next), size = next.getBoundingClientRect().height;
          if (size <= (parseFloat(css.lineHeight) || 32) * 3) {
            captionSpace = size + (parseFloat(css.marginBottom) || 0);
            let originalBlock = img;
            while (originalBlock.parentElement && originalBlock.parentElement !== root) originalBlock = originalBlock.parentElement;
            originalBlock.dataset.pdfImageCaption = '';
          }
        }
        let budget = height - headingSpace - tail - captionSpace;
        // Before the first image no image resizing has shifted the flow. If the
        // introduction is short, fit the image into its remaining first-page space.
        const prefix = rect.top - top;
        if (index === 0 && imageOnly && prefix < height * .55) {
          const preceding = [...copy.children].slice(0,[...copy.children].indexOf(block)+1);
          if (!preceding.some(n => n.matches('.luma-start-page,.luma-page-break'))) budget = Math.min(budget,height-prefix-tail-captionSpace);
        }
        const limit = Math.max(10 * pxPerMm,Math.min(height - 10 * pxPerMm,budget));
        img.style.setProperty('--pdf-image-height', `${limit}px`);
      });
    } finally { host.remove(); }
  }
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
  return { marker, install, prepare, normalizeLayout, pageDimensions, pageArea, pageStyle, prepareImageLayout, clearImageLayout };
});

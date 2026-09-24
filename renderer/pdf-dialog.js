(function () {
  "use strict";
  let pending = false, library;
  const loadLibrary = () => library ||= import("./vendor/pdfjs/pdf.min.mjs").then(pdfjs => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("./vendor/pdfjs/pdf.worker.min.mjs", location.href).href;
    return pdfjs;
  });
  window.LumaPdfDialog = {
    async open(language, { name, prepare, sections = [] }) {
      if (pending) return null;
      pending = true;
      const dialog = document.querySelector("#pdf-options-dialog"), $ = selector => dialog.querySelector(selector);
      const zh = language.startsWith("zh"), text = (en, tw) => zh ? tw : en;
      const input = $("#pdf-footer-text"), footer = $("#pdf-include-footer"), frame = $("#pdf-color-frame");
      const section = $("#pdf-section"), breakMode = $("#pdf-break-mode"), resetBreaks = $("#pdf-break-reset"), breaks = {};
      const paper = $("#pdf-paper"), font = $("#pdf-font-size"), inset = $("#pdf-inset");
      const save = $("#pdf-save"), close = $("#pdf-close"), status = $("#pdf-preview-status"), retry = $("#pdf-retry");
      const viewport = $("#pdf-preview-viewport"), canvas = $("#pdf-preview-canvas"), zoom = $("#pdf-preview-zoom");
      let active = true, revision = 0, generatedRevision = -1, printing = false, saving = false;
      let timer, pdf, loading, rendering, previewId, pageNumber = 1, renderRevision = 0, result = null;
      const fail = error => { status.textContent = text("Unable to prepare preview. ", "無法產生預覽。") + (error?.message || ""); retry.hidden = false; save.disabled = true; };
      const options = () => ({footerText:input.value, includeFooter:footer.checked, colorFrame:frame.checked, pageSize:paper.value, fontSize:Number(font.value), inset:Number(inset.value), breaks:{...breaks}});
      async function clearPdf() {
        renderRevision++;
        if (rendering) { rendering.cancel(); await rendering.promise.catch(() => {}); rendering = null; }
        if (loading) { const previous = loading; loading = null; pdf = null; await previous.destroy(); }
      }
      async function renderPage() {
        if (!active || !pdf) return;
        const id = ++renderRevision, doc = pdf;
        if (rendering) { rendering.cancel(); await rendering.promise.catch(() => {}); }
        const page = await doc.getPage(pageNumber);
        if (!active || id !== renderRevision) return;
        const natural = page.getViewport({scale:1});
        const fit = Math.max(.15, Math.min((viewport.clientWidth-40)/natural.width, (viewport.clientHeight-40)/natural.height));
        const scale = zoom.value === "fit" ? fit : Number(zoom.value);
        const density = Math.min(devicePixelRatio || 1, 2, 2200 / (natural.height * scale));
        const view = page.getViewport({scale:scale*density});
        canvas.width = Math.ceil(view.width); canvas.height = Math.ceil(view.height);
        canvas.style.width = `${natural.width*scale}px`; canvas.style.height = `${natural.height*scale}px`;
        canvas.setAttribute("aria-label", text(`PDF page ${pageNumber} of ${doc.numPages}`, `PDF 第 ${pageNumber} 頁，共 ${doc.numPages} 頁`));
        $("#pdf-page-count").textContent = `${pageNumber} / ${doc.numPages}`;
        $("#pdf-prev").disabled = pageNumber <= 1; $("#pdf-next").disabled = pageNumber >= doc.numPages;
        rendering = page.render({canvasContext:canvas.getContext("2d"), viewport:view});
        try { await rendering.promise; } catch (error) { if (error.name !== "RenderingCancelledException") throw error; }
      }
      async function generate() {
        if (!active || printing || saving) return;
        const id = revision;
        printing = true; previewId = null; save.disabled = true; retry.hidden = true;
        viewport.setAttribute("aria-busy", "true"); status.textContent = text("Preparing preview…", "正在產生預覽…");
        try {
          await clearPdf();
          const selected = options();
          await prepare(selected);
          if (!active) return;
          const generated = await window.lumaDesktop.previewPdf(selected);
          if (!active || id !== revision) return;
          if (!generated?.ok) throw new Error(generated?.message || text("Please try again.", "請再試一次。"));
          const pdfjs = await loadLibrary();
          if (!active || id !== revision) return;
          loading = pdfjs.getDocument({data:generated.bytes, isEvalSupported:false, useWasm:false});
          pdf = await loading.promise;
          if (!active || id !== revision) return;
          pageNumber = Math.min(pageNumber, pdf.numPages);
          await renderPage();
          if (!active || id !== revision) return;
          previewId = generated.previewId; generatedRevision = id; save.disabled = false;
          status.textContent = text(`${pdf.numPages} pages · Save this preview as PDF.`, `共 ${pdf.numPages} 頁・儲存內容與此預覽相同。`);
          viewport.setAttribute("aria-busy", "false");
        } catch (error) { if (active && id === revision) fail(error); }
        finally { printing = false; if (active && id !== revision) { clearTimeout(timer); timer = setTimeout(generate, 100); } }
      }
      function schedule() {
        revision++; previewId = null; save.disabled = true; retry.hidden = true;
        viewport.setAttribute("aria-busy", "true");
        status.textContent = text("Updating preview…", "正在更新預覽…");
        $("#pdf-font-value").textContent = `${font.value} px`;
        input.disabled = !footer.checked;
        clearTimeout(timer); timer = setTimeout(generate, 450);
      }
      const breakHelp = {
        auto: ["Follow the document’s page breaks and automatic layout.", "依文件的換頁標記與自動排版分頁。"],
        page: ["Start this block on a new page.", "從這一段開始另起一頁。"],
        flow: ["Ignore a forced break before this block and allow it to split. Page space still limits placement.", "取消本段前的指定換頁，並允許段落跨頁，減少大塊留白；剩餘空間不足時仍會換頁。"],
        keep: ["Keep this block on one page when it fits; this may leave more blank space.", "放得下一頁時，盡量讓整段留在同一頁；可能會增加前一頁的留白。"]
      };
      function selectBreak() { breakMode.value = breaks[section.value] || "auto"; $("#pdf-break-help").textContent = text(...breakHelp[breakMode.value]); }
      function updateSectionLabels() { [...section.options].forEach((option,i) => option.textContent = `${breaks[sections[i].id] ? "● " : ""}${i+1}. ${sections[i].label}`); }
      const cancel = event => { if (saving) event.preventDefault(); };
      const resize = new ResizeObserver(() => { if (pdf && !printing) renderPage().catch(fail); });
      try {
        const saved = await window.lumaDesktop.getPreferences();
        $("h2").textContent = text("Export PDF", "匯出 PDF");
        const labels = {pagination:["Adjust page breaks","微調分頁"],section:["Paragraph / block","選擇段落或區塊"],behavior:["Page break","分頁方式"],temporary:["Only this export; Markdown stays unchanged.","僅套用於這次匯出，不會修改 Markdown。"],paper:["Paper size","紙張大小"],font:["PDF text size","PDF 文字大小"],inset:["Page padding","頁面留白"],footer:["Add footer name","加上頁尾名稱"],name:["Footer name","頁尾名稱"],frame:["Add palette-colored frame","加上彩色外框"],manual:["Start a new page","指定換頁位置"],marker:["Insert this on its own line in Markdown:","在 Markdown 中另起一行，加入："]};
        for (const [key, values] of Object.entries(labels)) $(`[data-pdf-label="${key}"]`).textContent = text(...values);
        [...inset.options].forEach((option,i) => option.textContent = text(...[["Compact","較少"],["Standard","標準"],["Wide","較多"]][i]));
        section.replaceChildren(...sections.map(item => new Option(item.label,String(item.id))));
        updateSectionLabels(); selectBreak();
        [...breakMode.options].forEach((option,i) => option.textContent = text(...[["Automatic","自動"],["Start on a new page","從本段換頁"],["Continue from previous block","接續前段・減少留白"],["Keep this block together","本段盡量同頁"]][i]));
        resetBreaks.textContent = text("Reset page breaks","重設分頁調整");
        section.closest('fieldset').hidden = !sections.length;
        section.onchange = selectBreak;
        breakMode.onchange = () => { if (breakMode.value === "auto") delete breaks[section.value]; else breaks[section.value] = breakMode.value; updateSectionLabels(); selectBreak(); schedule(); };
        resetBreaks.onclick = () => { for (const key of Object.keys(breaks)) delete breaks[key]; updateSectionLabels(); selectBreak(); schedule(); };
        zoom.options[0].textContent = text("Fit page","整頁預覽"); zoom.value = "fit";
        close.textContent = text("Cancel","取消"); save.textContent = text("Save PDF…","儲存 PDF…"); retry.textContent = text("Retry preview","重新產生預覽");
        input.value = typeof saved?.pdfFooterText === "string" ? saved.pdfFooterText : "LumaReader";
        footer.checked = saved?.pdfIncludeFooter === true; frame.checked = saved?.pdfColorFrame === true;
        const layout = saved?.pdfLayout || {};
        paper.value = layout.pageSize === "Letter" ? "Letter" : "A4"; font.value = String(layout.fontSize || 18); inset.value = [6,10,14].includes(layout.inset) ? String(layout.inset) : "6";
        input.disabled = !footer.checked; save.disabled = true; close.disabled = false; canvas.width=0; canvas.height=0;
        $("#pdf-page-count").textContent = "—"; $("#pdf-prev").disabled = $("#pdf-next").disabled = true;
        for (const control of [input,footer,frame,paper,font,inset]) control.oninput = schedule;
        footer.onchange = () => { if (footer.checked) {input.focus(); input.select();} };
        close.onclick = () => { if (!saving) dialog.close(); };
        retry.onclick = schedule;
        $("#pdf-prev").onclick = () => { if (pdf && pageNumber>1) {pageNumber--;renderPage().catch(fail);} };
        $("#pdf-next").onclick = () => { if (pdf && pageNumber<pdf.numPages) {pageNumber++;renderPage().catch(fail);} };
        zoom.onchange = () => renderPage().catch(fail);
        save.onclick = async () => {
          if (!previewId || printing || saving || generatedRevision !== revision) return;
          saving = true; save.disabled = close.disabled = true;
          for (const control of [input,footer,frame,paper,font,inset,section,breakMode,resetBreaks]) control.disabled = true;
          try {
            const exported = await window.lumaDesktop.exportPdf({name, previewId});
            if (exported?.ok) { result = exported; dialog.close(); }
            else if (!exported?.canceled) throw new Error(exported?.message || text("Unable to save PDF.","無法儲存 PDF。"));
          } catch (error) { status.textContent = error.message; }
          finally {
            saving = false; save.disabled = close.disabled = false;
            for (const control of [input,footer,frame,paper,font,inset,section,breakMode,resetBreaks]) control.disabled = false;
            input.disabled = !footer.checked;
          }
        };
        const closed = new Promise(resolve => dialog.addEventListener("close", resolve, {once:true}));
        dialog.addEventListener("cancel", cancel);
        dialog.showModal(); resize.observe(viewport); if (footer.checked) {input.focus(); input.select();} else close.focus(); schedule();
        await closed;
        return result;
      } finally {
        active = false; clearTimeout(timer); resize.disconnect(); dialog.removeEventListener("cancel", cancel);
        await window.lumaDesktop.releasePdf().catch(() => {});
        await clearPdf().catch(() => {});
        pending = false;
      }
    }
  };
})();

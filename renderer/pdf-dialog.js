(function () {
  "use strict";
  let pending = false;
  window.LumaPdfDialog = {
    async open(language) {
      if (pending) return null;
      pending = true;
      try {
        const saved = await window.lumaDesktop?.getPreferences?.();
        const zh = language.startsWith("zh");
        const dialog = document.querySelector("#pdf-options-dialog");
        const input = dialog.querySelector("input");
        dialog.querySelector("h2").textContent = zh ? "匯出 PDF" : "Export PDF";
        dialog.querySelector("label span").textContent = zh ? "頁尾名稱" : "Footer name";
        dialog.querySelector(".pdf-footer-help").textContent = zh ? "顯示於每頁右下角；留白即可隱藏。匯出成功後會記住這個名稱。" : "Shown at the bottom right of each page. Leave blank to hide. Remembered after a successful export.";
        dialog.querySelector(".pdf-pagebreak-help").textContent = zh ? "需要指定換頁？在 Markdown 內獨立一行加入：" : "To start a new PDF page, add this on its own line in Markdown:";
        dialog.querySelector("[value=cancel]").textContent = zh ? "取消" : "Cancel";
        dialog.querySelector("[value=export]").textContent = zh ? "繼續匯出" : "Continue";
        input.value = typeof saved?.pdfFooterText === "string" ? saved.pdfFooterText : "LumaReader";
        dialog.returnValue = "cancel";
        const result = new Promise(resolve => dialog.addEventListener("close", () => resolve(dialog.returnValue === "export" ? input.value : null), {once:true}));
        dialog.showModal(); input.focus(); input.select();
        return await result;
      } finally { pending = false; }
    }
  };
})();

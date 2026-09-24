# Kainnne LumaReader 1.4.1

## 繁體中文

- 匯出 PDF 前可逐頁預覽實際結果，調整 A4／Letter 紙張、字級與留白。儲存使用預覽中的同一份 PDF，不會再次排版。
- 新增「微調分頁」：選擇段落或區塊後，可指定從本段換頁、接續前段以減少留白，或本段盡量同頁。可一鍵重設；設定只影響本次匯出，不修改 Markdown。
- 長表格可逐列跨頁並重複顯示欄位標題；長引用與程式碼區塊可接續下一頁，減少整塊跳頁造成的留白。
- 彩色外框的底部留白縮小，頁尾名稱改為灰色，並對齊外框與紙張底部之間的位置。外框沿用目前色系；頁尾與外框仍可獨立關閉。
- 加強繁體中文粗體的辨識度。既有直接編輯、原文與對照預覽、圖片、表格及程式碼功能保留。

超過一頁高度的單一表格列或圖片仍可能需要調整原文。「本段盡量同頁」不會強制將超長內容塞進一頁。既有 `<!-- lumareader:pagebreak -->` 分頁標記仍可使用。

網站另提供較精簡的手機工具列與免費嵌入工具；可在 [嵌入說明頁](https://lumareader.kainnne.com/embed/) 試用並載入自己的 Markdown。

## English

- Preview the actual PDF before saving. Adjust A4/Letter paper, text size and margins; saving writes the exact preview bytes without another print pass.
- Apply per-export pagination adjustments to individual sections: start a new page, continue after the previous section, or keep the section together where possible. Reset these adjustments at any time; the Markdown source is unchanged.
- Long tables flow by row with repeated column headings. Long quotes and code blocks can continue across pages, reducing unnecessary blank space.
- Refined optional palette-colored frame with less bottom space and a subtle gray footer name centered between the frame and page bottom. Footer and frame remain independent options.
- Clearer Chinese bold text. Existing direct/source editing, comparison preview, images, tables and basic code editing remain available.

A table row or image taller than a printable page may still need document adjustments. Keep-together is best effort. Existing Markdown page-break markers remain supported.

macOS: pink production icon, Universal, Developer ID signed and Apple notarized. Windows: unsigned x64 Setup and Portable; SmartScreen or Unknown Publisher warnings may appear. Linux: x64 AppImage and .deb. Existing OS default-app choices remain under user control.

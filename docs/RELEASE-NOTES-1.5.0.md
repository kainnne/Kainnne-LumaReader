# Kainnne LumaReader 1.5.0

## 繁體中文

- PDF 匯出改為文件排版介面：文字與圖片板塊可拖動分欄、上下排序、群組與調整欄寬；多選、復原／重做、文字格式及獨立儲存均保留。排版資料與 Markdown 分開，修改 PDF 排版不會重排或覆寫原文。
- 紙張提供 A4、Letter、16:9、4:3 與直橫方向；字級改用拖桿。彩色外框、頁尾、頁碼和重點標註可調整，完成排版後直接匯出。表格按列延續、圖片等比例呈現，匯出不帶入把手、工具列或捲動條。
- 編輯模式選單提供一般編輯、原文及原文對照預覽；桌面另提供文件排版。編輯時隱藏文件頁籤，避免切換文件遺失草稿；閱讀時可拖動頁籤排序。
- 桌面、線上 Reader 和嵌入版使用同一套圓角細線圖示，滑鼠移上即可看到功能提示。桌面和一般網頁預設顯示閱讀方式；設定仍可調整顯示項目。嵌入版保留精簡預設、既有客製化設定、文件與註記接口。
- PDF 橫向把手採低飽和度細線滑片，與六點移動把手分開；拉伸限制在所在欄。靠右分欄更直覺，同一右欄可放多段短文。
- 桌面程式碼編輯改善縮排與行距，保留語法上色；閱讀時可選擇切換深色模式。支援本機 GIF 與網頁分享中內嵌 GIF 動畫。
- 大型本機資料夾掃描可顯示進度並逐批使用結果，搜尋包含資料夾名稱；閱讀和手機版不再因圖片載入或視窗尺寸變化微幅回捲。本機與網頁的相對圖片保留既有授權及自動配對流程。
- 桌面 App 新增 Agent 指令介面：`--luma-agent help`、`inspect`、`export`。可用 JSON 排版稿輸出同一套 PDF，不改主介面、不改原始 Markdown，預設不覆寫 PDF。使用方式見 [AGENT-PDF.md](https://github.com/kainnne/Kainnne-LumaReader/blob/v1.5.0/docs/AGENT-PDF.md)。

PDF 排版稿及桌面註記存在 App 的本機資料中，單獨複製 Markdown 不會帶走這些資料。嵌入網站的後台儲存仍由整合網站透過既有接口負責。

## English

- PDF export opens a separate document-layout workspace. Drag text and image blocks into columns, reorder or group selections, adjust widths, edit formatting, and undo or redo changes. Saved PDF layouts remain separate from the original Markdown.
- Choose A4, Letter, 16:9 or 4:3 with portrait or landscape orientation. A size slider, colored frame, footer, page numbers and annotations remain configurable. Export directly after arranging the document; tables continue by row, images retain their proportions, and controls or scrollbars are excluded.
- Choose normal editing, Markdown source, or source with preview from one menu. Desktop also includes document layout. Tabs can be reordered while reading and are hidden during editing to protect drafts.
- Desktop, Web and embedded readers share one rounded line-icon system with immediate function hints. Reading mode appears by default on desktop and standalone Web; embedded readers preserve compact defaults, host configuration, and existing document and annotation APIs.
- Muted fine-line horizontal handles are separated from the six-dot movement grips and constrained to their column. Multiple short passages can stack in one right column.
- Desktop code editing improves indentation and line spacing while retaining syntax highlighting and optional dark-mode guidance. Local GIFs and self-contained GIF images in Web shares retain animation.
- Large desktop libraries show scan progress and make partial results available. Search includes folder names. Image loading and viewport changes no longer nudge the reading position. Existing authorized image-matching flows remain available.
- The desktop executable includes `--luma-agent help`, `inspect`, and `export`, using the same PDF renderer and JSON layout data without changing the normal UI or source Markdown. Existing output files are protected by default. See [AGENT-PDF.md](https://github.com/kainnne/Kainnne-LumaReader/blob/v1.5.0/docs/AGENT-PDF.md).

Desktop PDF layouts and annotations are stored separately in app-local data. Embedded hosts remain responsible for backend persistence through the existing APIs.

## Downloads

- macOS: pink production icon, Universal Apple silicon / Intel, Developer ID signed, notarized and stapled after release validation.
- Windows: x64 Setup and Portable, unsigned; Windows may show SmartScreen.
- Linux: x64 AppImage and .deb, validated on Ubuntu 22.04 and 24.04 before publication.
- Standard download packages start in English. All 11 interface languages remain available in Settings; existing language preferences are preserved. The download chooser enables only published language editions.

The app does not automatically change the operating system's default Markdown handler.

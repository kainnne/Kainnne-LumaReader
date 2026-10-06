# PDF layout and export — 1.5.0

Use the share icon at the far right of the desktop toolbar, or **File → Edit / Export PDF…** (⌘⇧E / Ctrl+Shift+E), to enter the document-layout workspace. The same workspace is available from the editing-mode menu. Finish and save an existing Markdown edit before changing to document layout.

Drag a block using its six-dot grip. Drop beside another block to create a column, or above/below it to reorder content. Several short blocks can stack in one column. Shift-select a range, or use Ctrl/Command for individual selections, to move or group blocks together. Horizontal width handles adjust a block within its column; they do not stretch it vertically. Double-click a block to edit its text. Undo and redo apply to layout changes.

Choose A4, Letter, 16:9 or 4:3, portrait or landscape, and adjust text size with the 8–22 px slider. Colored frame and footer name are the main appearance controls. Text adjustments and other options, including page numbers, start collapsed. The preview/export button is beside Save, and exports directly from the current layout using the native PDF engine. Exported pages exclude toolbars, selection outlines, handles and scrollbars.

**Save** stores a separate layout draft in the App's local data. PDF text, ordering, columns and formatting do not overwrite the original Markdown. Standard preview shows the Markdown; layout preview shows the saved PDF arrangement. Canceling discards unsaved layout changes. Moving or renaming a Markdown file changes its document identity; copying only the Markdown does not copy the local PDF draft.

Tables continue by row, images retain their proportions, and headings stay with following content where possible. Review complex reports before sharing. A block larger than a printable page may need smaller text, a different page size or a simpler layout.

## 繁體中文

桌面版右上角的分享圖示，或「File → Edit / Export PDF…」（⌘⇧E／Ctrl+Shift+E），會開啟文件排版介面；編輯模式選單也能進入。若正在修改 Markdown，請先儲存，再切換文件排版。

用六點把手拖動內容，放在左右可分欄，放在上下可排序；同一欄可堆放多段短文。Shift 可選取連續內容，Ctrl／Command 可個別多選，再一起移動或建立群組。左右細線把手只能在該欄範圍內調整寬度，不會向下拉長。點兩下文字可編輯；排版操作支援復原與重做。

紙張提供 A4、Letter、16:9、4:3 與直橫方向；字級拖桿為 8–22 px。彩色外框、頁尾名稱為主要設定；文字調整與其他功能預設收合，頁碼也在其他功能中。「預覽並匯出 PDF」位於儲存旁，從當前排版直接輸出，不會帶入操作工具、把手、選取框或捲軸。

**排版與原始 Markdown 分開儲存。** 文件排版中的文字、排序、分欄及格式不會覆寫原文。一般預覽呈現 Markdown，排版預覽呈現已儲存的 PDF 稿。取消會捨棄尚未儲存的排版變更。排版資料存在 App 本機資料區；只複製 Markdown 不會帶走排版稿，檔案搬移或改名後也不會自動沿用原位置的稿件。

「加上重點標記」預設關閉；開啟時輸出已核對文字位置的重點底色。浮動文字筆記與圖片註記不會插入正文。註記同樣獨立於 Markdown。

## Existing Markdown page-break marker

An existing `<!-- lumareader:pagebreak -->` on its own line remains supported by the standard Markdown PDF renderer. Place it at the document's top level, with blank lines before and after it, outside code, tables, lists and blockquotes. The layout workspace manages its own content flow; use its preview to arrange the report rather than adding manual break markers to the source.

## Agent export

Installed desktop apps expose the same layout/PDF engine through `--luma-agent help`, `inspect` and `export`. See [AGENT-PDF.md](AGENT-PDF.md) for the JSON contract, image access and output protection.

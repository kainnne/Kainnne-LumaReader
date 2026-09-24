# PDF export and manual page breaks

In the desktop app, choose **File → Export as PDF…** (⌘⇧E / Ctrl+Shift+E), or enable **Export PDF** in Settings. Finish editing and save first. The export dialog provides independent **Add footer name** and **Add palette-colored frame** checkboxes. Both start unchecked for white pages without a decorative frame or footer name. Enabling the footer selects **LumaReader** or the last saved company name so it can be replaced; leaving the name blank also hides it. Turning the footer off preserves the name for later. Successful exports remember the name and both options across windows and restarts; canceling or a failed export preserves the previous choices. The footer appears at the bottom right of each page. Existing Markdown content, images, and syntax colors remain intact in either page style.

## Start a new PDF page

Put this exact marker on its own line, with a blank line before and after it, immediately before the content that should begin on a new page:

```markdown
# Project overview

Content on the first page.

<!-- lumareader:pagebreak -->

# Implementation

This section starts on the next PDF page.
```

Use the marker at the document's top level, outside code fences, indented code, tables, blockquotes, and lists. LumaReader shows a subtle **PDF page break** separator while reading; the separator is omitted from the PDF. A marker at the beginning or end, or repeated adjacent markers, does not add blank pages. A literal marker shown inside a code block remains an example and does not force a page break.

Other Markdown tools treat the marker as an ordinary HTML comment. The source file stays portable. Page length still depends on font size, images, and natural content flow; review the exported PDF before printing. Documents over 500,000 characters use the large-document plain-text preview and do not interpret Markdown page-break markers.

## 中文使用方式

桌面版選擇「檔案 → 匯出 PDF」，或在設定中開啟匯出按鈕。可分別勾選「加上頁尾名稱」與「加上彩色外框」；第一次使用時，兩項預設都不勾選，輸出白底、沒有裝飾外框和頁尾名稱的 PDF。勾選頁尾後，名稱會反白，可改成公司名稱或清空。取消勾選不會清掉已記住的名稱；只有成功匯出才會保存名稱與選項，其他視窗和下次開啟也能沿用。

要指定換頁，在下一段前加入獨立一行的 `<!-- lumareader:pagebreak -->`，前後各留一個空行。標記需位於文件最外層，不放進程式碼、表格、引用或清單中；閱讀時顯示的「PDF 換頁」提示不會印出。文件開頭、結尾或連續標記不會產生空白頁。


## Local 1.4.1 preview (not yet a desktop release)

The blue 1.4.1 preview adds a PDF preview with A4/Letter, text size, page padding, footer and frame controls. Updates are debounced and serialized. The preview renders the generated PDF with offline PDF.js, one page at a time; **Save PDF** writes the exact cached bytes displayed in the latest preview. Save is disabled while options are changing. Canceling the native save dialog returns to the preview; canceling the preview clears its window-local cache. A successful save remembers layout and footer choices.

Long tables flow between pages by row and repeat column headings. Long code blocks and blockquotes may continue on the next page instead of moving as a single block. Headings stay with following content where possible; images and formulas stay together. A single table row or image taller than one printable page can still require manual document adjustments. Use the preview and existing page-break marker to check the final layout.

## 1.4.1：本次匯出的分頁微調

PDF 預覽左側的「微調分頁」可選擇文件最外層的段落、標題、表格或清單區塊，再指定「自動」、「從本段換頁」、「接續前段・減少留白」或「本段盡量同頁」。可分別調整多段，有設定的項目前會顯示圓點，也可一鍵重設。每次調整都重新產生實際 PDF 預覽；儲存使用該預覽的相同資料。

「接續前段」會取消該區塊前的手動換頁與前一區塊的排版避讓，允許段落跨頁；紙張剩餘空間不足時仍會換頁。「本段盡量同頁」適合短段落；超過一頁的內容不能強制塞進同一頁。表格以整張表為一個區塊，不提供逐列拖曳排版。

這些設定僅保留在本次匯出視窗，關閉後清除，不修改 Markdown。需要長期保留指定換頁位置時，仍使用獨立一行的 `<!-- lumareader:pagebreak -->`。

### 1.4.2 本機測試版：重點標記

PDF 預覽新增「包含重點標記」，預設不勾選。開啟時印出文字上的重點底色，關閉時維持乾淨正文；浮動筆記和圖片註記不會插入正文或列印。註記存於 App 資料區，不修改 Markdown。直接編輯可新增重點、文字註解、圖片註記；改用原文編輯或外部軟體改稿後，無法核對的位置保留為待確認，避免標錯句子。檔案搬移或改名視為新的文件位置，舊註記不會自動跟隨。

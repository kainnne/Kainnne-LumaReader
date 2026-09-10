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

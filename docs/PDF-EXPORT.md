# PDF export and manual page breaks

In the desktop app, choose **File → Export as PDF…** (⌘⇧E / Ctrl+Shift+E), or enable **Export PDF** in Settings. Finish editing and save first. The export dialog selects the default footer name, **LumaReader**, so you can confirm it, replace it with a company name, or erase it to omit the footer. A successful export remembers the name, including an empty name, across windows and restarts. Canceling or a failed export preserves the last successful name. The footer appears at the bottom right of each page.

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

桌面版選擇「檔案 → 匯出 PDF」，或在設定內開啟匯出按鈕。頁尾預設為 **LumaReader**，文字會反白，可直接輸入公司名稱，也可清空以隱藏。只有成功匯出才會記住新的名稱，下一次匯出與其他視窗均可沿用。

要指定換頁，在下一段前加入獨立一行的 `<!-- lumareader:pagebreak -->`，前後各留一個空行。標記需位於文件最外層，不放進程式碼、表格、引用或清單中；閱讀時顯示的「PDF 換頁」提示不會印出。文件開頭、結尾或連續標記不會產生空白頁。

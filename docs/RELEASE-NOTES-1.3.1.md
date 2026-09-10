# Kainnne LumaReader 1.3.1

## Editing

- Preview reflow no longer scrolls the Markdown source while typing, including unequal source/preview widths. Deliberate scrolling continues to synchronize the panes; the editor can still reveal the caret when it reaches the edge.
- Formatting, image insertion, and indentation use native editing history alongside typing, so Undo and Redo work consistently. The Insert menu preserves the visible text selection while choosing a format.
- Comparison preview starts enabled for new Web and Desktop users. A saved choice to turn it off remains respected.

## PDF export

- Separate checkboxes control the footer name and the palette-colored frame. Both initially remain unchecked for plain white pages without a decorative frame or footer name.
- Successful exports remember the name and both options across windows and restarts. Turning the footer off keeps the saved name for later; canceling or a failed export does not replace your choices.
- Manual page breaks (`<!-- lumareader:pagebreak -->`), Markdown rendering, and rounded colored frames continue to work.

## Website and Web reader

- Traditional Chinese copy has been revised for natural Taiwanese wording while retaining the original meaning.
- The demo still lists macOS, Windows, and Linux downloads and a link back to the homepage. The official Kainnne header logo is preserved.

## Downloads

- macOS: Universal DMG and ZIP for Apple silicon and Intel, Developer ID signed and notarized by Apple.
- Windows: x64 Setup and Portable. These packages remain unsigned; SmartScreen or an unknown-publisher prompt may appear.
- Linux: x64 AppImage and .deb; tested on Ubuntu 22.04 and 24.04 with Chromium sandboxing enabled.
- Default Markdown applications remain the user's operating-system choice. The app does not rewrite defaults or reset system association databases.

## 繁體中文

- 修正編輯時預覽換行帶動原文跳動的問題，原文與預覽寬度不同時也能穩定輸入；主動捲動仍會同步對照位置。
- 粗體、插入圖片與縮排都能和一般輸入一樣復原、重做。點開插入選單選擇格式時，原本選取的文字會維持反白。
- 網頁版與桌面版的新用戶，首次編輯時都會開啟對照預覽；自行關閉後，仍會沿用你的設定。
- 匯出 PDF 前，可分別勾選「加上頁尾名稱」與「加上彩色外框」。第一次預設都不勾選，輸出白底、沒有外框與頁尾名稱的版本；成功匯出後會記住選項。取消勾選頁尾不會清掉公司名稱。
- 保留原有的指定換頁功能，並調整網站與網頁閱讀器的繁中用語，讓說明更符合台灣的閱讀習慣。

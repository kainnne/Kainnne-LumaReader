# Kainnne LumaReader 1.2.0

Released September 6, 2026.

## English

- Open a Markdown file from macOS or Windows directly into an editable window. Its containing folder appears in the sidebar. Separate files keep separate windows and unsaved edits; reopening the same file focuses its existing window. Up to eight windows can be open at once.
- Vertical reading, source view, and editing now wrap long text to the available width. Live preview scrolling accounts for wrapped source lines. These changes also ship in LumaReader Web.
- Source, Media, and Export PDF start hidden. Enable them in Settings when needed. Upgrading applies the new PDF default once; subsequent user choices remain saved. PDF export is available in the desktop edition.
- The guide explains how to choose LumaReader as the default Markdown app yourself. The application does not register protocols or change system defaults at launch. macOS bundles and Windows installers still declare supported Markdown file types for Open With. Windows installation and removal preserve existing extension defaults; macOS declares LumaReader as an alternate handler.
- Desktop windows have separate document folders and authenticated local services. Saving checks for external changes and replaces the file after writing a temporary copy. Folder scans, includes, diagram rendering, and simultaneous windows have resource limits. Large documents use a plain-text preview.

**Downloads:** macOS Universal (Apple silicon and Intel), Developer ID signed and notarized by Apple. Windows x64 Setup and Portable are unsigned; Windows may show SmartScreen or Unknown publisher.

**Scope:** Web edits stay in the current browser session and do not overwrite the original local file. Creating a share link sends a temporary document copy to the share service for 30 days. Remote document media may contact its origin. These safeguards reduce specific risks; signing and tests are not a guarantee that every document or machine is free from faults.

## 繁體中文

- 從 macOS 或 Windows 點開 Markdown，即可在可編輯的獨立視窗中開啟，左側顯示檔案所在資料夾。各視窗保留自己的文件與未儲存修改；重開同一檔案會回到既有視窗，最多同時 8 個視窗。
- 直式閱讀、原文檢視與編輯文字會依可用寬度自動換行，即時預覽同步捲動也會計入換行後的位置。網頁版同步更新。
- Source、Media 與 Export PDF 預設收起，需要時可在設定中開啟。升級會套用一次新的 PDF 預設值，之後會保留使用者自行調整的選擇；PDF 匯出為桌面版功能。
- 導覽說明如何自行在 Finder 或 Windows 設定中選取 Markdown 預設程式。App 不會在啟動時註冊通訊協定或更改系統預設值；Mac App 與 Windows 安裝程式仍宣告支援的檔案格式，讓系統可提供「打開方式」選項。Windows 安裝與移除會保留原有副檔名預設值；Mac 則宣告為可選的替代開啟程式。
- 桌面視窗使用各自的資料夾與具存取憑證的本機服務。儲存前檢查外部修改，先寫入暫存檔再替換原檔；資料夾掃描、內容引用、圖表渲染與同時開啟的視窗都設有資源限制。大型文件使用純文字預覽。

**下載：**Mac Universal 支援 Apple 晶片與 Intel，具 Developer ID 簽章並通過 Apple 公證。Windows x64 提供安裝版與免安裝版，目前未簽章，可能出現 SmartScreen 或未知發行者提示。

**使用範圍：**網頁版修改保留於目前瀏覽器工作階段，不會覆寫電腦裡的原檔。建立分享連結時會暫存文件分享副本 30 天，遠端媒體可能連線至來源網站。上述措施可降低特定風險；簽章與測試不能保證所有文件及電腦都不會遇到問題。

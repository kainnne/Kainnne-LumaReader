const editions = {
  en: {
    "type": "MARKDOWN DESKTOP READER",
    "download-note": "Free download · Version 1.0.1 · macOS and Windows",
    "macos-action": "DOWNLOAD FOR",
    "macos-status": "Universal",
    "windows-action": "DOWNLOAD FOR",
    "windows-status": "x64 Setup",
    "macos-notice-title": "macOS · Signed and notarized",
    "macos-notice": "The macOS build is signed with Developer ID and notarized by Apple.",
    "windows-notice-title": "Windows · Unsigned",
    "windows-notice": "Windows only: this build is currently unsigned, so Windows may show SmartScreen or “Unknown publisher” warnings when you download or open it.",
    "github-link": "View on GitHub",
    "solution-label": "WHAT IT SOLVES",
    "solution-title": "Markdown reading, local processing, and a designed interface.",
    "solution-lead": "LumaReader turns files in an ordinary folder into rendered documents while keeping reading, search, and editing on your computer.",
    "solution-1-title": "Markdown presentation",
    "solution-1-body": "Headings, tables, code, mathematics, and diagrams are rendered as a complete reading layout instead of raw markup.",
    "solution-2-title": "Runs locally",
    "solution-2-body": "Choose a folder on your computer. Scanning, search, reading, preview, and editing run on the device.",
    "solution-3-title": "Documents stay private",
    "solution-3-body": "No account or document upload. LumaReader does not collect usage analytics, document content, or document telemetry.",
    "solution-4-title": "Reading interface",
    "solution-4-body": "Clear typography, three reading modes, light and dark appearances, and 22 palettes provide practical layout choices.",
    "release-label": "VERSION HISTORY",
    "release-title": "Version 1.0.1 update details",
    "release-date": "August 27, 2026",
    "release-1-title": "Preview the true end when you need it",
    "release-1-body": "Normal synchronized scrolling stays unchanged. When the source reaches the end but the rendered preview still has content below, a “Show bottom” button appears inside the preview.",
    "release-2-title": "A clear reminder while editing",
    "release-2-body": "Selecting another Markdown file during editing now shows a palette-matched notice that reminds you to save or exit editing first.",
    "release-notes-link": "Full v1.0.1 release notes",
    "version-history-link": "Previous versions",
    "overview-label": "DETAILED FEATURES",
    "overview-title": "LumaReader feature details",
    "overview-lead": "Supported formats, folder navigation, reading modes, rendering, editing, and interface settings are listed below.",
    "feature-1-title": "Supported Markdown and text formats",
    "format-documents-label": "Markdown · on by default",
    "format-documents-value": ".md, .markdown, .mkd, .mdx",
    "format-data-label": "Plain text · opt in",
    "format-data-value": ".txt, .log",
    "format-tables-label": "Format filter",
    "format-tables-value": "Enable TXT and LOG separately when needed",
    "feature-2-title": "Folder library, search, and sidebar navigation",
    "feature-2-body": "Choose one root folder and scan its nested files with a visible elapsed-time counter. Search opens every parent folder needed to reveal a match, then restores your previous folder state when cleared; the sidebar can be widened for long names or collapsed for focus.",
    "feature-3-title": "Vertical, horizontal, and paged reading modes",
    "feature-3-body": "Use a full-width vertical page, horizontal reading, or paged navigation with left/right or up/down page turns. Both axes have draggable scrollbars, and text-size or layout changes keep you close to the same reading position.",
    "feature-4-title": "Extended Markdown rendering",
    "feature-4-body": "Render tables, task lists, alerts, highlighted code, KaTeX mathematics, Mermaid diagrams, footnotes, emoji, abbreviations, superscript, subscript, and reusable local includes.",
    "feature-5-title": "Create, edit, preview, and save Markdown",
    "feature-5-body": "Choose any destination folder for a new .md, confirm its name and location, and start writing immediately. Edit beside an optional live preview with a draggable split and synchronized scrolling; resize source and editor text with Command/Ctrl + or −, then save without leaving the editor.",
    "feature-6-title": "Local documents and interface settings",
    "feature-6-body": "Your library stays on your computer: no account, upload, or automatic translation. LumaReader includes 11 interface languages, light and dark modes, 22 palettes with a neutral reading surface, saved preferences, and a short first-launch guide.",
    "footer-copy": "LumaReader is free and open source.",
    "footer-link": "More from Kainnne"
  },
  zh: {
    "type": "MARKDOWN 桌面閱讀器",
    "download-note": "免費下載 · 版本 1.0.1 · 支援 macOS 與 Windows",
    "macos-action": "下載版本",
    "macos-status": "Universal",
    "windows-action": "下載版本",
    "windows-status": "x64 安裝版",
    "macos-notice-title": "macOS · 已簽章與公證",
    "macos-notice": "Mac 版已完成 Developer ID 簽章與 Apple 公證。",
    "windows-notice-title": "Windows · 尚未簽章",
    "windows-notice": "僅限 Windows：目前 Windows 版尚未簽章，下載或開啟時可能出現 SmartScreen 或「未知發行者」警告。",
    "github-link": "前往 GitHub",
    "solution-label": "LUMAREADER 解決什麼問題",
    "solution-title": "Markdown 閱讀、本機執行、資料不外流。",
    "solution-lead": "LumaReader 會將資料夾裡的 Markdown 轉成完整閱讀版面；檔案掃描、搜尋、閱讀、預覽與編輯都在本機進行。",
    "solution-1-title": "美化 Markdown",
    "solution-1-body": "標題、表格、程式碼、數學公式與圖表會轉成完整閱讀版面，不必直接看原始標記。",
    "solution-2-title": "本機執行",
    "solution-2-body": "直接選取電腦上的資料夾，掃描、搜尋、閱讀、預覽與編輯都在裝置上完成。",
    "solution-3-title": "資料不外流",
    "solution-3-body": "不需要帳號、不上傳文件，也不蒐集使用分析、文件內容或文件遙測資料。",
    "solution-4-title": "閱讀介面",
    "solution-4-body": "清楚排版、三種閱讀模式、亮暗外觀與 22 組配色，可依文件和閱讀情境調整。",
    "release-label": "版本更新紀錄",
    "release-title": "版本 1.0.1 更新內容",
    "release-date": "2026 年 8 月 27 日",
    "release-1-title": "需要時才顯示真正的最底部",
    "release-1-body": "平常維持原本的同步捲動。當左側原文已到底、右側預覽仍有內容時，預覽窗內會出現「顯示最底部」按鈕。",
    "release-2-title": "編輯中切換文件會清楚提醒",
    "release-2-body": "編輯時若點選其他 Markdown，現在會顯示符合當前色系的提示，提醒先儲存或退出編輯模式。",
    "release-notes-link": "查看 v1.0.1 完整更新紀錄",
    "version-history-link": "過往版本",
    "overview-label": "詳細功能",
    "overview-title": "LumaReader 功能說明",
    "overview-lead": "以下整理支援格式、資料夾導覽、閱讀模式、內容渲染、編輯與介面設定。",
    "feature-1-title": "支援的 Markdown 與純文字格式",
    "format-documents-label": "Markdown · 預設開啟",
    "format-documents-value": ".md、.markdown、.mkd、.mdx",
    "format-data-label": "純文字 · 自行勾選",
    "format-data-value": ".txt、.log",
    "format-tables-label": "格式篩選",
    "format-tables-value": "需要時可分別啟用 TXT 與 LOG",
    "feature-2-title": "資料夾資料庫、搜尋與側欄導覽",
    "feature-2-body": "指定根目錄後，LumaReader 會掃描子資料夾並持續顯示已用秒數。搜尋時會自動展開結果所在的上層資料夾，清除關鍵字後還原原本收合狀態；側欄也能拖寬或整個收起。",
    "feature-3-title": "直式、橫向與逐頁閱讀模式",
    "feature-3-body": "直式提供全寬頁面，也能切換橫向閱讀或逐頁瀏覽；翻頁可選左右或上下方向。水平、垂直方向都有可拖曳捲軸，調整字級或版面後也會盡量保留原本閱讀位置。",
    "feature-4-title": "延伸 Markdown 內容渲染",
    "feature-4-body": "表格、待辦清單、提示區塊、程式碼上色、KaTeX 數學公式、Mermaid 圖表、註腳、Emoji、縮寫、上下標與本機內容引用都能整理成好讀頁面。",
    "feature-5-title": "新增、編輯、預覽與儲存 Markdown",
    "feature-5-body": "新增 .md 時可先選擇任意目的資料夾，再確認名稱與位置並立刻開始編輯。編輯時可開啟即時對照預覽、拖曳調整兩邊寬度並同步捲動；原文與編輯字級也能用 Command／Ctrl 搭配 + 或 − 調整，儲存後仍留在編輯畫面。",
    "feature-6-title": "本機文件與介面設定",
    "feature-6-body": "不必建立帳號，也不會上傳或自動翻譯內容。LumaReader 提供 11 種介面語言、亮暗模式與 22 組配色，閱讀紙張維持清楚的中性色；偏好會被保存，第一次開啟也有簡短導覽。",
    "footer-copy": "LumaReader 免費開源。",
    "footer-link": "更多 Kainnne 作品"
  }
};

const languageToggle = document.querySelector(".language-toggle");
const languageOptions = document.querySelectorAll("[data-language-option]");

function setEdition(language) {
  const nextCopy = editions[language];

  document.body.classList.add("is-switching");
  window.setTimeout(() => {
    document.querySelectorAll("[data-copy]").forEach((element) => {
      element.textContent = nextCopy[element.dataset.copy];
    });
    document.documentElement.lang = language === "zh" ? "zh-Hant" : "en";
    languageToggle.setAttribute("aria-pressed", String(language === "zh"));
    languageToggle.setAttribute(
      "aria-label",
      language === "zh" ? "顯示英文版本" : "Show the Traditional Chinese edition"
    );
    languageOptions.forEach((option) => {
      option.classList.toggle("is-active", option.dataset.languageOption === language);
    });
    document.body.classList.remove("is-switching");
  }, 150);
}

languageToggle.addEventListener("click", () => {
  const language = languageToggle.getAttribute("aria-pressed") === "true" ? "en" : "zh";
  setEdition(language);
});

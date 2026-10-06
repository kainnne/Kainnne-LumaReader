const editions = {
  "en": {
    "type": "MARKDOWN READER · DESKTOP + WEB",
    "download-note": "Desktop v1.5.0 · macOS, Windows and Linux",
    "download-activity-summary": "Download activity",
    "download-activity-loading": "Checking the count…",
    "download-activity-note": "Desktop downloads counted since v1.1.0; Linux included from v1.3.0.",
    "download-activity-zero": "The counter has just started. Please give LumaReader a try.",
    "download-activity-low": "LumaReader has been downloaded {count} times. Please give it a try too.",
    "download-activity-growing": "LumaReader has been downloaded {count} times. Thank you for giving it a try.",
    "download-activity-established": "Kainnne LumaReader has been downloaded about {count} times.",
    "download-activity-error": "The download count is temporarily unavailable.",
    "macos-action": "DOWNLOAD FOR",
    "windows-action": "DOWNLOAD FOR",
    "macos-trust": "Developer ID signed · Notarized by Apple",
    "windows-trust": "Unsigned · SmartScreen or “Unknown publisher” may appear",
    "macos-spec": "Universal app · Apple silicon + Intel · DMG",
    "windows-spec": "64-bit Windows · Setup installer",
    "web-entry-label": "NO INSTALLATION",
    "web-entry-title": "Try the reading interface in your browser",
    "web-entry-body": "Open up to 3 documents. Get Desktop for folder libraries and PDF export.",
    "github-link": "View on GitHub",
    "solution-label": "WHAT IT SOLVES",
    "solution-title": "Local Markdown reading and editing for individual developers.",
    "solution-lead": "Open project documentation and development notes from their existing folders. Read comfortably, edit formatted text directly, or show Markdown beside a preview. Your files stay on your own computer.",
    "solution-1-title": "Work from your project folders",
    "solution-1-body": "Open a Markdown file or choose a folder. Keep the existing structure, search file and folder names, and switch between documents in the sidebar.",
    "solution-2-title": "A comfortable reading layout",
    "solution-2-body": "Read headings, tables, code, and diagrams as a formatted document. Adjust text size, reading mode, palette, and light or dark appearance to suit your screen.",
    "solution-3-title": "Write directly in the document",
    "solution-3-body": "Click to edit text and tables without working around Markdown symbols. Choose source + preview from the editing-mode menu when you want to compare them; text wraps while deliberate scrolling keeps the panes in sync.",
    "solution-4-title": "Keep control of your documents",
    "solution-4-body": "Reading and editing need no account or document upload. Creating a Web share link sends a temporary copy to the share service for 30 days; remote images may contact their hosts.",
    "release-label": "VERSION HISTORY",
    "release-title": "LumaReader 1.5.0 · Desktop, Web and embed",
    "release-date": "October 6, 2026",
    "release-1-title": "Arrange Markdown for PDF reports",
    "release-1-body": "Arrange text and images in a separate layout workspace. Drag blocks into columns, resize their width, group selections, and undo changes. Paper size, typography, footer and page numbering remain controllable; your original Markdown stays unchanged.",
    "release-2-title": "Edit, switch documents, and read code",
    "release-2-body": "Choose normal editing, source editing, or source with preview from one menu. Reorder document tabs when reading. Desktop code editing keeps indentation and syntax colors clear; local and shared Web images can retain GIF animation.",
    "release-3-title": "One icon system, with immediate hints",
    "release-3-body": "Desktop, Web and embedded readers share a consistent icon toolbar with immediate function hints. Reading mode is visible by default on desktop and Web. The desktop Agent CLI exports PDFs through the same layout and rendering engine.",
    "release-notes-link": "Read the 1.5.0 release notes",
    "version-history-link": "Download previous versions",
    "web-label": "WEB EDITION",
    "web-title": "Open Markdown in the browser",
    "web-copy": "The LumaReader reading and editing interface now runs directly in the browser. Files are read locally without upload; folder libraries, downloads, and PDF export remain desktop-only.",
    "web-action": "Open LumaReader Web",
    "web-point-1-title": "Open up to three documents",
    "web-point-1-body": "Open or drag in Markdown and plain-text files, then remove them individually when you want to make room for another document.",
    "web-point-2-title": "Complete reading controls",
    "web-point-2-body": "Four reading modes, 22 palettes, 11 languages, outlines, media, source view, and dark mode are included.",
    "web-point-3-title": "Edit and share Markdown",
    "web-point-3-body": "Edit the rendered text directly, or choose source editing with or without a preview from the editing-mode menu. Share the finished Markdown as a link that opens in the Web reader.",
    "overview-label": "DETAILED FEATURES",
    "overview-title": "LumaReader feature details",
    "overview-lead": "Supported formats, folder navigation, reading modes, rendering, editing, and interface settings are listed below.",
    "feature-1-title": "Markdown, text, and desktop code files",
    "format-documents-label": "Markdown · on by default",
    "format-documents-value": ".md, .markdown, .mkd, .mdx",
    "format-data-label": "Plain text · opt in",
    "format-data-value": ".txt, .log",
    "format-tables-label": "Code · Desktop · opt in",
    "format-tables-value": ".py, .c, .h, .cpp, .hpp, .js, .ts",
    "feature-2-title": "Folder library, search, and sidebar navigation",
    "feature-2-body": "Each desktop document shows its containing folder in the sidebar. Search file and folder names together to expand matching results, refresh the library, and check scanning or read-access notices when something is missing.",
    "feature-3-title": "Vertical, horizontal, and paged reading modes",
    "feature-3-body": "Use vertical, horizontal, or paged reading. Vertical text wraps to the available width; wide tables and code can scroll within their own blocks. Paged navigation supports left/right and up/down page turns.",
    "feature-4-title": "Extended Markdown rendering",
    "feature-4-body": "Render tables, task lists, alerts, highlighted code, KaTeX mathematics, Mermaid diagrams, footnotes, emoji, abbreviations, superscript, subscript, and reusable local includes.",
    "feature-5-title": "Create, edit, preview, and save Markdown",
    "feature-5-body": "Create a .md in your chosen folder and edit its formatted text directly. Choose source + preview from the editing-mode menu. The Format menu explains each tool, tables have editable cells, and formatting supports undo. Unsaved changes require confirmation before leaving.",
    "feature-6-title": "Export the rendered document as PDF",
    "feature-6-body": "Use the share icon to enter the PDF layout workspace. Arrange columns, text and images, choose paper size and orientation, adjust typography, colored frame, footer and page numbers, then export directly. Layout edits are stored separately from Markdown.",
    "feature-7-title": "Local documents and interface settings",
    "feature-7-body": "The Settings icon brings together 11 interface languages, light and dark modes, 22 palettes, and controls for hiding individual toolbar features. Preferences stay saved, and the first-launch guide shows where to adjust them.",
    "feature-8-title": "Open Markdown in the desktop app",
    "feature-8-body": "On macOS and Windows, choose LumaReader from Open With for .md, .markdown, .mkd, and .mdx. On Linux, run the AppImage and open a file or folder inside the app. Each file opens in an editable window, up to eight at a time. Default-app choices remain in your operating system settings.",
    "footer-copy": "LumaReader is free and open source.",
    "footer-embed": "Free website embed",
    "footer-contact": "Contact the author",
    "footer-link": "More from Kain³e",
    "linux-action": "DOWNLOAD FOR",
    "linux-trust": "AppImage · Make executable to run",
    "linux-spec": "AppImage · Tested on Ubuntu 22.04 x64",
    "linux-deb": "Ubuntu 22.04 / 24.04 · .deb download"
  },
  "zh": {
    "type": "MARKDOWN 閱讀與編輯工具 · 桌面版／網頁版",
    "download-note": "桌面版 v1.5.0 · 支援 macOS、Windows 與 Linux",
    "download-activity-summary": "累計下載次數",
    "download-activity-loading": "正在讀取下載次數…",
    "download-activity-note": "桌面版自 v1.1.0 起統計下載次數，Linux 則自 v1.3.0 起計入。",
    "download-activity-zero": "還沒有人下載，歡迎成為第一位使用者。",
    "download-activity-low": "目前已下載 {count} 次，歡迎下載試試看。",
    "download-activity-growing": "目前已下載 {count} 次，謝謝大家的支持。",
    "download-activity-established": "LumaReader 累計已下載約 {count} 次。",
    "download-activity-error": "目前暫時無法讀取下載次數。",
    "macos-action": "下載",
    "windows-action": "下載",
    "macos-trust": "已簽署 Developer ID，並通過 Apple 公證",
    "windows-trust": "尚未簽署 · 安裝時可能出現 SmartScreen 或「未知的發行者」提示",
    "macos-spec": "通用版本 · 支援 Apple 晶片與 Intel · DMG 安裝檔",
    "windows-spec": "適用於 64 位元 Windows",
    "web-entry-label": "免安裝，先試用",
    "web-entry-title": "先用網頁版，體驗閱讀與編輯",
    "web-entry-body": "最多同時開啟 3 份文件。想瀏覽整個資料夾或匯出 PDF，可下載桌面版。",
    "github-link": "前往 GitHub",
    "solution-label": "為什麼使用 LumaReader",
    "solution-title": "讓本機的 Markdown 文件，更好讀也更好改",
    "solution-lead": "直接開啟專案資料夾裡的文件與開發筆記。閱讀時有清楚舒服的版面，修改時可以直接點文字，也能開啟原文對照；檔案都留在自己的電腦裡。",
    "solution-1-title": "接著用原本的專案資料夾",
    "solution-1-body": "開啟一份 Markdown，或選擇整個資料夾，就能開始使用。保留原有的檔案結構，透過側邊欄切換文件，也能搜尋檔名與資料夾名稱。",
    "solution-2-title": "閱讀文件，也可以很舒服",
    "solution-2-body": "標題、表格、程式碼與圖表都有清楚的排版。字體大小、閱讀方式、配色和深淺色模式，都能依照自己的習慣調整。",
    "solution-3-title": "直接點文字，就能開始寫",
    "solution-3-body": "直接修改排好版的文字與表格，不必一直在 Markdown 符號間切換。需要對照語法時，從編輯模式選單選擇「原文＋對照預覽」；內文會自動換行，捲動時也能同步預覽。",
    "solution-4-title": "文件留在自己的電腦",
    "solution-4-body": "閱讀和編輯都不需要帳號，也不用上傳文件。只有建立網頁分享連結時，才會將分享副本暫存 30 天；文件若含外部圖片，載入時仍會連線到圖片來源。",
    "release-label": "最新版本",
    "release-title": "LumaReader 1.5.0 · 桌面、網頁與嵌入版",
    "release-date": "2026 年 10 月 6 日",
    "release-1-title": "把 Markdown 排成報告 PDF",
    "release-1-body": "PDF 排版稿與 Markdown 分開儲存。拖動文字與圖片分欄，調整欄寬、群組與順序，操作可復原；紙張、字級、頁尾和頁碼都能調整，原始 Markdown 維持不變。",
    "release-2-title": "更順手的編輯與文件切換",
    "release-2-body": "編輯模式集中在同一個選單，可選一般編輯、原文或原文對照預覽。閱讀時可拖動頁籤排序；桌面程式碼編輯保留清楚的縮排與語法色彩，本機及分享網頁也支援 GIF 動畫。",
    "release-3-title": "統一圖示，指到就看得懂",
    "release-3-body": "桌面、網頁及嵌入版採用同一套圖示，滑鼠移上去就顯示功能提示。桌面與網頁預設顯示閱讀方式；Agent 可透過桌面 App 的指令介面，使用同一套排版與渲染輸出 PDF。",
    "release-notes-link": "查看 1.5.0 更新內容",
    "version-history-link": "下載舊版",
    "web-label": "網頁版",
    "web-title": "打開瀏覽器，就能讀 Markdown",
    "web-copy": "不必先安裝，網頁版就能體驗 LumaReader 的閱讀與編輯介面。文件由瀏覽器直接讀取，不會因為開啟文件而上傳。瀏覽整個資料夾、下載文件及匯出 PDF 等功能，請使用桌面版。",
    "web-action": "開啟 LumaReader 網頁版",
    "web-point-1-title": "最多同時開啟 3 份文件",
    "web-point-1-body": "選取檔案或直接拖入 Markdown、純文字檔即可開啟。想換一份文件時，先移除目前不需要的文件，就能空出位置。",
    "web-point-2-title": "依照習慣調整閱讀介面",
    "web-point-2-body": "可選擇 4 種閱讀方式、22 組配色與 11 種介面語言，也能查看文件大綱、媒體和原文，或切換深色模式。",
    "web-point-3-title": "改好文件，再分享出去",
    "web-point-3-body": "直接修改排好版的文字，或從編輯模式選單切換原文與原文對照預覽。完成後建立分享連結，讓對方用網頁版開啟文件。",
    "overview-label": "功能介紹",
    "overview-title": "功能一覽",
    "overview-lead": "從開啟檔案到閱讀、編輯與匯出，看看 LumaReader 能幫你做什麼。",
    "feature-1-title": "Markdown、純文字與桌面程式碼",
    "format-documents-label": "Markdown · 預設顯示",
    "format-documents-value": ".md、.markdown、.mkd、.mdx",
    "format-data-label": "純文字 · 可自行勾選",
    "format-data-value": ".txt、.log",
    "format-tables-label": "程式碼 · 桌面版可勾選",
    "format-tables-value": ".py、.c、.h、.cpp、.hpp、.js、.ts",
    "feature-2-title": "從側邊欄瀏覽與搜尋資料夾",
    "feature-2-body": "桌面版的側邊欄會顯示目前文件所在的資料夾。搜尋檔名或資料夾名稱時，符合條件的資料夾會自動展開。若有檔案沒出現，可按重新整理，並查看掃描進度或讀取提示。",
    "feature-3-title": "直式、橫式或翻頁，自己選",
    "feature-3-body": "直式閱讀時，內文會隨視窗寬度自動換行。較寬的表格與程式碼可以在各自區塊內捲動；切換翻頁模式後，則能選擇左右或上下翻頁。",
    "feature-4-title": "常用與進階 Markdown 語法都支援",
    "feature-4-body": "包含表格、待辦清單、提示區塊、程式碼語法上色、KaTeX 數學公式、Mermaid 圖表、註腳、表情符號、縮寫、上下標，以及引用本機檔案內容。",
    "feature-5-title": "新增、編輯、預覽與儲存，一次完成",
    "feature-5-body": "選好資料夾、新增 .md 後，就能直接點文字編輯。需要語法時從編輯模式選單選擇「原文＋對照預覽」。格式選單提供用途說明，表格可直接修改儲存格，格式操作也能復原；離開未儲存的文件前，會先詢問是否放棄修改。",
    "feature-6-title": "依需求匯出 PDF",
    "feature-6-body": "按分享圖示進入 PDF 排版介面，調整分欄、文字與圖片，再選紙張、方向、字級、彩色外框、頁尾及頁碼後直接匯出。排版修改另外儲存，不會改動 Markdown 原文。",
    "feature-7-title": "把介面調整成順手的樣子",
    "feature-7-body": "點開設定圖示，就能切換 11 種介面語言、深淺色模式與 22 組配色，也能決定工具列要顯示哪些按鈕。設定會自動保留，首次使用時也有導覽帶你認識。",
    "feature-8-title": "用桌面版開啟 Markdown",
    "feature-8-body": "在 macOS 或 Windows，從 Markdown 檔案的「開啟方式」選擇 LumaReader；Linux 可先執行 AppImage，再於程式內開啟檔案或資料夾。每份文件會在獨立的編輯視窗開啟，最多同時 8 個。是否設為預設程式，由你在作業系統中決定。",
    "footer-copy": "LumaReader 免費使用，原始碼也公開。",
    "footer-embed": "免費嵌入網站",
    "footer-contact": "聯絡作者",
    "footer-link": "更多 Kain³e 作品",
    "linux-action": "下載",
    "linux-trust": "AppImage · 先允許執行，再開啟",
    "linux-spec": "AppImage · 已在 Ubuntu 22.04 x64 測試",
    "linux-deb": "Ubuntu 22.04／24.04 也可下載 .deb 安裝檔"
  }
};

const languageToggle = document.querySelector(".language-toggle");
const languageOptions = document.querySelectorAll("[data-language-option]");
const downloadActivity = document.querySelector("#download-activity");
const downloadActivityCount = document.querySelector("#download-activity-count");
const downloadCountEndpoint = "https://lumareader-share.chaos60649.workers.dev/api/downloads";
let currentLanguage = "en";
let downloadCount = null;
let downloadCountFailed = false;

function renderDownloadCount() {
  if (!downloadActivityCount) return;
  const strings = editions[currentLanguage];
  if (downloadCountFailed) {
    downloadActivityCount.textContent = strings["download-activity-error"];
    return;
  }
  if (!Number.isFinite(downloadCount)) {
    downloadActivityCount.textContent = strings["download-activity-loading"];
    return;
  }
  const count = Math.max(0, Math.floor(downloadCount));
  const key = count === 0
    ? "download-activity-zero"
    : count < 50
      ? "download-activity-low"
      : count < 500
        ? "download-activity-growing"
        : "download-activity-established";
  const formatted = new Intl.NumberFormat(currentLanguage === "zh" ? "zh-Hant" : "en").format(count);
  downloadActivityCount.textContent = strings[key].replace("{count}", formatted);
}

async function loadDownloadCount() {
  if (downloadActivity?.dataset.loaded === "true") return;
  downloadActivity.dataset.loaded = "true";
  try {
    const response = await fetch(downloadCountEndpoint, { cache: "no-store" });
    if (!response.ok) throw new Error(`Download count request failed: ${response.status}`);
    const payload = await response.json();
    downloadCount = Number(payload.total);
    if (!Number.isFinite(downloadCount)) throw new Error("Invalid download count");
  } catch {
    downloadCountFailed = true;
  }
  renderDownloadCount();
}

function setEdition(language) {
  const nextCopy = editions[language];
  currentLanguage = language;

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
    languageToggle.textContent=language==="zh"?"EN":"中文";
    languageToggle.lang=language==="zh"?"en":"zh-Hant";
    window.dispatchEvent(new CustomEvent("lumareader:edition"));
    renderDownloadCount();
    document.body.classList.remove("is-switching");
  }, 150);
}

languageToggle.addEventListener("click", () => {
  const language = languageToggle.getAttribute("aria-pressed") === "true" ? "en" : "zh";
  setEdition(language);
});

downloadActivity?.addEventListener("toggle", () => {
  if (downloadActivity.open) loadDownloadCount();
});

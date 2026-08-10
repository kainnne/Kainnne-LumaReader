const copy = {
  en: {
    "overview-title": "A focused reader for the files you already own.",
    "overview-lead": "Point LumaReader at a folder and turn it into a calm, visual document library. Nothing needs to be imported or uploaded.",
    "feature-1-title": "Make any folder your library.",
    "feature-1-body": "Browse Markdown files and nested folders from one clean, collapsible sidebar.",
    "feature-2-title": "Shape the reading experience.",
    "feature-2-body": "Adjust text size, choose from 20 palettes, switch light or dark appearance, and read vertically, horizontally, or page by page.",
    "feature-3-title": "Render more than basic Markdown.",
    "feature-3-body": "Open Markdown and MDX with tables, task lists, alerts, highlighted code, KaTeX mathematics, and Mermaid diagrams.",
    "feature-4-title": "Keep media in context.",
    "feature-4-body": "Preview local images, audio, video, linked files, and reusable Markdown includes alongside your writing.",
    "feature-5-title": "Stay local, private, and flexible.",
    "feature-5-body": "Your documents remain on your computer. The app supports macOS, Windows, and an interface available in 11 languages."
  },
  zh: {
    "overview-title": "專心閱讀你真正擁有的文件。",
    "overview-lead": "選擇一個資料夾，LumaReader 就會把它變成安靜、清楚又好看的文件庫，不必匯入，也不必上傳。",
    "feature-1-title": "任何資料夾都能成為你的文件庫。",
    "feature-1-body": "透過乾淨、可收合的側邊欄，瀏覽 Markdown 文件與所有子資料夾。",
    "feature-2-title": "把閱讀畫面調成你喜歡的樣子。",
    "feature-2-body": "調整字體大小、選擇 20 組配色與明暗模式，並切換直向、橫向或分頁閱讀。",
    "feature-3-title": "完整呈現不只基礎 Markdown。",
    "feature-3-body": "支援 Markdown、MDX、表格、待辦清單、提示區塊、程式碼上色、KaTeX 數學公式與 Mermaid 圖表。",
    "feature-4-title": "讓媒體內容留在閱讀脈絡裡。",
    "feature-4-body": "直接預覽本機圖片、音訊、影片、連結檔案與可重複引用的 Markdown 內容。",
    "feature-5-title": "保持本機、隱私與彈性。",
    "feature-5-body": "文件始終留在你的電腦。應用程式支援 macOS、Windows，介面提供 11 種語言。"
  }
};

const languageToggle = document.querySelector(".language-toggle");
const languageOptions = document.querySelectorAll("[data-language-option]");
const downloadNote = document.querySelector(".download-note");

function setLanguage(language) {
  const nextCopy = copy[language];

  document.body.classList.add("is-switching");
  window.setTimeout(() => {
    document.querySelectorAll("[data-copy]").forEach((element) => {
      element.textContent = nextCopy[element.dataset.copy];
    });
    document.documentElement.lang = language === "zh" ? "zh-Hant" : "en";
    languageToggle.setAttribute("aria-pressed", String(language === "zh"));
    languageToggle.setAttribute(
      "aria-label",
      language === "zh" ? "將功能說明切換為英文" : "Switch feature description to Traditional Chinese"
    );
    languageOptions.forEach((option) => {
      option.classList.toggle("is-active", option.dataset.languageOption === language);
    });
    document.body.classList.remove("is-switching");
  }, 150);
}

languageToggle.addEventListener("click", () => {
  const language = languageToggle.getAttribute("aria-pressed") === "true" ? "en" : "zh";
  setLanguage(language);
});

document.querySelectorAll("[data-download]").forEach((button) => {
  button.addEventListener("click", () => {
    downloadNote.textContent = `${button.dataset.download} download is coming soon.`;
    downloadNote.classList.remove("is-notified");
    void downloadNote.offsetWidth;
    downloadNote.classList.add("is-notified");
  });
});

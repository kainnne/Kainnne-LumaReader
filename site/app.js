const editions = {
  en: {
    "windows-notice": "Windows preview builds will initially be unsigned. Microsoft Defender SmartScreen may show an “unrecognized app” notice because the publisher is not yet verified. Download only from this official site or GitHub Releases.",
    "overview-title": "A calmer way to live with Markdown.",
    "overview-lead": "LumaReader gives an ordinary folder the feel of a considered reading app: clear hierarchy, comfortable typography, and powerful rendering without an account or a complicated setup.",
    "feature-1-title": "A folder interface you already understand.",
    "feature-1-body": "Choose a library folder and LumaReader turns its existing structure into a clean, collapsible sidebar. Search documents, move between nested folders, and follow the outline without reorganizing your files.",
    "feature-2-title": "Designed for reading, not managing.",
    "feature-2-body": "The interface keeps navigation and essential controls close while giving the document visual priority. Collapse the library whenever you want fewer distractions, then return without losing your place.",
    "feature-3-title": "Make the page feel like yours.",
    "feature-3-body": "Adjust text size, move between light and dark appearances, choose from 20 carefully tuned palettes, and read vertically, horizontally, or one page at a time.",
    "feature-4-title": "Rich Markdown, without extra setup.",
    "feature-4-body": "Open Markdown, MDX, MKD, and .markdown files with tables, task lists, alerts, highlighted code, KaTeX mathematics, Mermaid diagrams, and reusable includes.",
    "feature-5-title": "Keep media inside the story.",
    "feature-5-body": "Preview local images, audio, video, and linked files in context, so visual references and supporting material remain part of the reading flow.",
    "feature-6-title": "Local-first from start to finish.",
    "feature-6-body": "Your library stays on your computer and its contents are never translated automatically. LumaReader supports macOS, Windows, and an interface available in 11 languages."
  },
  zh: {
    "windows-notice": "Windows 預覽版目前尚未取得程式碼簽章，第一次開啟時可能出現 SmartScreen 的「無法辨識」提醒。請只從 LumaReader 官方網站或 GitHub Releases 下載；若系統顯示明確的威脅名稱，請停止執行並回報。",
    "overview-title": "把普通資料夾，變成真正想打開的閱讀空間。",
    "overview-lead": "LumaReader 不要求你改變原本的整理方式。選好資料夾，就能在清楚的目錄、舒服的排版與安靜的介面裡閱讀；功能放在需要的位置，文件仍然是畫面的主角。",
    "feature-1-title": "照原本習慣整理，不必把文件搬家。",
    "feature-1-body": "資料夾層級會直接變成左側文件庫，子資料夾可以展開或收合，也能快速搜尋文件、切換內容與查看文章目錄。檔案怎麼放，LumaReader 就怎麼呈現。",
    "feature-2-title": "介面安靜，但該有的操作都在手邊。",
    "feature-2-body": "閱讀、切換與調整功能都集中在容易理解的位置，不需要先學一套複雜流程。想專心時可以收起文件庫，把注意力完整留給正在看的內容。",
    "feature-3-title": "同一份文件，也能換一種舒服的讀法。",
    "feature-3-body": "字體大小、明暗模式與 20 組配色都能自由調整；長文可以直向捲動、橫向閱讀或逐頁翻閱，依照當下的螢幕與閱讀習慣切換。",
    "feature-4-title": "內容再豐富，也能整理成好讀的頁面。",
    "feature-4-body": "除了 Markdown 與 MDX，也支援表格、待辦清單、提示區塊、程式碼上色、KaTeX 數學公式、Mermaid 圖表與內容引用，技術文件不必犧牲可讀性。",
    "feature-5-title": "圖片、影音與參考資料，都留在文章脈絡裡。",
    "feature-5-body": "本機圖片、音訊、影片及連結檔案可以直接預覽，不必為了查看素材在多個視窗之間來回切換。",
    "feature-6-title": "文件留在電腦，選擇權也留在你手上。",
    "feature-6-body": "LumaReader 以本機閱讀為核心，不會自動翻譯或上傳文件內容。應用程式支援 macOS、Windows，介面提供 11 種語言，文件本身仍維持原貌。"
  }
};

const languageToggle = document.querySelector(".language-toggle");
const languageOptions = document.querySelectorAll("[data-language-option]");
const downloadNote = document.querySelector(".download-note");

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

document.querySelectorAll("[data-download]").forEach((button) => {
  button.addEventListener("click", () => {
    downloadNote.textContent = `${button.dataset.download} download is coming soon.`;
    downloadNote.classList.remove("is-notified");
    void downloadNote.offsetWidth;
    downloadNote.classList.add("is-notified");
  });
});

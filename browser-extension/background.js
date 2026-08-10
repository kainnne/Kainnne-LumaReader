const READER_URL = "kainnne-lumareader://open";
const MARKDOWN_EXTENSIONS = [".md", ".mkd", ".mdx", ".markdown"];

function canOpen(url) {
  if (!/^(file|https?):\/\//i.test(url || "")) return false;
  const path = (url || "").split(/[?#]/)[0].toLowerCase();
  return MARKDOWN_EXTENSIONS.some((extension) => path.endsWith(extension));
}

async function openCurrentDocument() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const target = new URL(READER_URL);
  if (canOpen(tab?.url)) target.searchParams.set("source", tab.url);
  await chrome.tabs.create({ url: target.href });
}

chrome.action.onClicked.addListener(() => openCurrentDocument());
chrome.commands.onCommand.addListener((command) => {
  if (command === "open-in-lumareader") openCurrentDocument();
});

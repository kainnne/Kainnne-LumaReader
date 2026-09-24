# LumaReader 一行指令嵌入工具

免費使用原版 LumaReader Web，沒有另外設計的工具列、編輯器樣式或翻譯。嵌入 iframe 直接載入 `site/web/index.html`；HTML、CSS、語言、設定、格式選單與閱讀／編輯模式都共用同一份程式。

## 給使用者的指令

電腦需有 Node.js。在網站資料夾執行：

```sh
npx --yes https://lumareader.kainnne.com/embed/lumareader-embed.tgz ./index.html
```

指定另一份 HTML 或初始 Markdown：

```sh
npx --yes https://lumareader.kainnne.com/embed/lumareader-embed.tgz ./novel.html --markdown ./transcript.md
```

- HTML 存在：先完整備份，再插入掛載區塊與官方載入程式。
- HTML 不存在：建立可用頁面。
- 已有嵌入區塊時拒絕重複安裝。不修改 JS 框架元件或不完整 HTML 片段。
- 用現有網站伺服器透過 HTTP／HTTPS 開啟 HTML；不支援 file://。
- 預設草稿存在訪客自己的瀏覽器，可另存 `.md`。不需 API key，不建立後台，不自動把文件上傳伺服器。瀏覽器儲存失敗會顯示錯誤，內容仍留在編輯器，可下載備份。
- MIT 授權，可免費用於個人與商業網站，散布程式碼時保留授權聲明。

公開入口：<https://lumareader.kainnne.com/embed/>。工具原始碼在 `tools/embed-cli/`，不依賴第三方 npm 套件，也沒有安裝生命週期腳本。Pages 部署流程以 `npm pack` 建立約 3 KB 的安裝工具，提供 npx 直接下載執行；不需要全域安裝。

## 實作與維護

- `tools/embed-cli/embed.cjs`：備份及修改使用者指定的 HTML，Markdown 以防止 script 結束標籤注入的 JSON 儲存。
- `site/embed/install.js`：安裝後的掛載程式。讀取 HTML 文件資料、維護瀏覽器草稿、提供外層放大與下載按鈕。
- `site/embed/lumareader.js`：iframe 通訊與尺寸管理；驗證來源視窗、origin、channel 和 boot ID。
- `site/web/embed-bridge.js`：只在嵌入模式啟用的資料連接層，不產生另一套前端介面。
- Reader 原有「儲存」會等待外層儲存成功；原有「取消修改」、插入圖片、語言設定及對照預覽仍使用原本邏輯。嵌入文件的新插入圖片使用 data URI，使重建 iframe 後仍存在；大型圖片可能超過瀏覽器草稿容量，會顯示儲存失敗，網站需使用自己的後台或下載備份。
- 若瀏覽器禁止第三方 iframe 的 localStorage，Reader 設定暫存在該 iframe 記憶體；文件仍由外層網站保存。
- 放大與縮回只改外層容器尺寸，保留 iframe 與編輯紀錄。外層網站不要把容器放在 `transform` 或 `contain: paint` 祖先中。
- 網站 CSP 須允許從 `https://lumareader.kainnne.com` 載入 module script 和 iframe；安裝工具不擅自放寬原網站的 CSP。

需要自行接後台時，可直接使用 SDK 的 `mountLumaReader(container,{document,onChange,onSave})`。`document` 是 `{id,title,markdown}`；`onChange` 收到最新 `{id,title,markdown,revision}`，`onSave` 必須在真正寫入成功後才 resolve。`await editor.save()` 成功後再 `await editor.destroy()` 切換步驟；後台失敗或有較新的未儲存修改時會拒絕移除。`getDocument()` 取回最新文字，`expand()`／`collapse()` 控制尺寸。這是一般程式介面，並不需要 agent 專用指令或文件。

## 本機驗證

```sh
node scripts/serve-embed.cjs
node --test tests/embed-cli.test.js
LUMA_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node scripts/embed-smoke.cjs
LUMA_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node scripts/embed-cli-smoke.cjs
```

開啟 <http://127.0.0.1:4174/embed/demo.html>。完整網站資源如需自行部署，可執行 `node scripts/build-embed.cjs`，取用 `dist-preview/embed/LumaReader-Embed-v1/`。桌面 App 的測試版本與此安裝工具各自獨立，發布工具不代表發布桌面 App。

## 更新相容性契約

- 固定安裝網址為 `/embed/lumareader-embed.tgz`。舊的版本網址（例如 `lumareader-embed-1.0.0.tgz`）保留於 `tools/embed-cli/releases/` 並繼續部署，不覆寫已發布的歷史套件。
- 已生成的 HTML 永久使用 `/embed/install.js`、`data-luma-target`、`data-luma-document` 與文件 JSON `{id,title,markdown}`。這些是 v1 公開介面。Reader 內部可升級，破壞性的整合介面變更須另外開新入口，不能刪除 v1。
- 保留 `lumareader-embed-v1` 訊息協定，以及既有文件 ID／localStorage 草稿鍵值；修改資料格式時必須提供相容讀取或遷移。
- 一般 Reader 更新不需要重跑安裝。已開啟的頁面重新整理後，在瀏覽器／網站快取更新後載入相容的新版本。
- `tests/fixtures/embed-v1.html` 是凍結的舊客戶範例，不能為了讓新版測試通過而改寫；`scripts/embed-cli-smoke.cjs` 會驗證這份舊 HTML 在新版 Reader 中可載入、修改、儲存及保留草稿。
- 更新安裝工具版本時，把新版本 tarball 加入 `tools/embed-cli/releases/`；Pages 同時提供所有歷史檔案及固定最新版別名。

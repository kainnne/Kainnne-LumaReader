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

- 嵌入後預設收起側邊欄並直接進入編輯，不搶走外層頁面的鍵盤焦點。一般 Web 閱讀模式不變。
- 只展示文件時，在載入 `install.js` 的 script 加上 `data-luma-readonly="true"`；SDK 對應 `readOnly: true`。
- `--markdown` 將指定文件內容存入 HTML，省略時才載入示範。這是當下的副本，不會自動同步後續 .md 修改；相對圖片路徑以網頁位置為準。
- 瀏覽器優先還原相同文件 ID 的草稿；換一份文件請更換 JSON 的文件 ID，避免舊草稿遮蓋新內容。
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

## 更新嵌入版本

官方固定載入網址持續提供相容更新。先儲存文件，再重新整理網頁；快取更新後就會載入新版。

使用工具安裝的 HTML 可執行 `npx --yes https://lumareader.kainnne.com/embed/lumareader-embed-1.1.0.tgz ./index.html --update`。工具讀取 `/embed/version.json`，備份 HTML 並只更新官方載入網址的版本參數，不更動文件 JSON、ID 或其他內容；須重新部署該 HTML。手貼的 HTML 保留官方固定網址即可。自託管完整資源包仍需自行替換資源。

每次發布 Web 嵌入更新時，同步更新 `site/embed/version.json`、`install.js` 的預設資源版本與說明頁的版本／變更內容。版本參數用於更新快取，不是歷史版本鎖定；破壞性更新仍須遵守 v1 相容契約。

## 選擇嵌入功能（v1 相容擴充）

公開說明與可複製設定在 https://lumareader.kainnne.com/embed/#customize 。設定規格為 `/embed/options.schema.json`，小說設定範例為 `/embed/novel-options.json`。agent 可依網站用途讀取規格後產生設定，不需另一套編輯器。

在原本 `install.js` script 加 `data-luma-options="my-luma-options"`，並於其前方放 `<script type="application/json" id="my-luma-options">{...}</script>`。JSON 接受 `mode`（direct/source/preview）、`readOnly`、`sourcePreview`，及 `features` 的 sidebar/modeSwitch/rename/share/formatting/settings 布林值。SDK 在 mountLumaReader options 直接使用這些欄位。安裝 loader 另支援 expand/download 控制外層按鈕。

預設直接編輯，sidebar 為 true，modeSwitch 為 false，sourcePreview 與其餘 features 為 true。小說文案建議關閉 sidebar/modeSwitch/rename/share；Markdown 工具可開 source 與 modeSwitch；展示頁開 preview + readOnly。preview 只決定初始模式，readOnly 才會關閉文字與名稱修改。這些 UI 設定不是後台授權機制。features 限制不會被訪客偏好蓋掉。

嵌入實例最多包含 3 份 Markdown。拿掉新增按鈕；空白文件提供拖曳／匯入、直接撰寫入口。側邊欄統一為匯入、文件列表、大綱，預設可展開但先收起。features.sidebar=false 可隱藏側欄，仍支援拖曳。每份文件有固定 ID；切換會保留草稿。

點檔名可改名稱，副檔名固定。改名透過既有 onChange/onSave 回傳 title（不含 .md），id 不變，revision 會增加；僅改名也必須儲存。瀏覽器草稿鍵不變，重新掛載和下載沿用新名稱。一般 Web 僅修改分頁文件名稱，不改作業系統檔案。


### 多文件與語言

`onChange`、`onSave`、`getDocument()` 相容既有 `{id,title,markdown,revision}`，title/markdown 是目前顯示的文件，最外層 id 仍是原 host ID。新增 `files:[{id,title,markdown}]`（最多 3 份）及 `activeFileId`。需要多文件的後台請保存完整快照，再傳回 `document`；舊整合只讀 markdown 仍取得目前文件，但不會自動保存其他文件。安裝 loader 的瀏覽器草稿已保存完整快照。`editor.save()` 成功後再移除或切換外層步驟。瀏覽器清除資料或更換裝置不會保留草稿，需要持久儲存請接 onSave 後台。

`language:'zh-Hant'`（亦支援 en、zh-Hans、ja 等既有語言）指定每次掛載的初始語言；`features.language:false` 隱藏切換入口。預設允許切換。原 preferences.language 也相容，明確 language 優先。

更新指令使用不可變的 1.1.0 工具網址，以避開 npx 對舊版固定別名的快取。此工具每次查詢最新 Web version.json，工具網址中的版本不會鎖住 Reader 版本，之後可沿用同一行。


### 工具列勾選與目前文章

嵌入版預設只顯示設定與編輯／儲存。設定內提供格式、分享 Markdown 勾選，皆預設 false。以 `toolbar:{formatting:true,share:true}` 指定初始勾選，每次掛載重新套用；`features.formatting/share:false` 仍可完全停用該選項。一般 Web 不受影響。

網站使用目前開啟的文章：`await editor.getActiveDocument()` 回傳 `{id,activeFileId,title,markdown}`，不帶其他草稿。既有 onChange/onSave/getDocument 的頂層 title/markdown 同樣只對應目前文件，切換時立即更新。files 只用於草稿還原，不合併或逐份當成網站文章提交。網站儲存文章取 title/markdown 即可；需要草稿恢復時另存完整快照。下載與下一步也使用目前文章。重新掛載時以 activeFileId 指向的文件校正 title/markdown，避免舊快照欄位不一致。

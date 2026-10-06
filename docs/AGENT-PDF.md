# 用 Agent 匯出 Luma Reader PDF

這個指令入口隨新版桌面 App 一起提供。使用者只需安裝 App，Agent 不需要額外安裝 Node、npm、瀏覽器控制器或 Python 套件。一般介面維持原樣，指令不會操作正在使用的視窗。

正式版 1.5.0 的 macOS、Windows、Linux 安裝包均包含這個入口；舊版 1.4.2 沒有。需要能執行桌面 App 的環境，不是無顯示環境的伺服器工具。

## 第一次使用

找到安裝 App 的執行檔，以 `--luma-agent help` 取得 JSON 說明、參數、排版範例與退出碼。這是可由 Agent 直接讀取的穩定 `lumareader.agent/v1` 合約。

macOS 正式版安裝到 Applications 時：

```sh
"/Applications/Kainnne LumaReader.app/Contents/MacOS/Kainnne LumaReader" --luma-agent help
```

測試版的 App 名稱不同，請使用該 `.app/Contents/MacOS/` 下的執行檔。不使用 `open -a`，因為指令需要等候完成並讀取 JSON 回應。

Windows 使用安裝資料夾內的 `Kainnne LumaReader.exe`，Linux 使用下載的 AppImage 或已安裝的 `kainnne-lumareader`。參數相同，路徑有空白時加引號。Windows 的 Agent 應以子程序啟動並擷取 stdout／退出碼；PowerShell 可使用 `& "執行檔路徑" --luma-agent help`。

## 最簡單的匯出

以下用 `LUMA` 表示 App 執行檔，不是另一個需安裝的程式。

```sh
LUMA --luma-agent export "文章.md" --output "報告.pdf"
```

預設使用 App 的 16:9 橫式、粉紅彩色外框、LumaReader 頁尾、頁碼及 16 px 文字。這些是獨立工作的預設，與使用者當前設定分開。

```sh
LUMA --luma-agent export "文章.md" --output "報告.pdf" --paper A4 --orientation portrait --font-size 14 --footer "我的公司"
```

白底、沒有外框／頁尾／頁碼：

```sh
LUMA --luma-agent export "文章.md" --output "報告.pdf" --plain --no-footer --no-page-numbers
```

成功後 stdout 只回傳一筆 JSON，包含 `ok`、`protocol`、`output`、`pages`、`bytes`、`sourceHash`、`documentUnchanged` 與 `warnings`。退出碼 0 表示成功；2 表示輸入／排版設定錯誤，3 表示渲染／匯出失敗，4 表示目的 PDF 已存在。

預設不覆寫既有 PDF。只有明確加上 `--overwrite` 才會替換。

## 需要分欄時

先查文件結構：

```sh
LUMA --luma-agent inspect "文章.md"
```

`blocks` 提供 1 起算的索引、穩定 ID、類型與內容摘錄。Agent 先判斷哪一段是長文、哪些短文適合並排，再寫一份小型 JSON；不要猜索引。文件不同時索引也會不同。

例如 inspect 確認第 2 塊是長文、第 3／4 塊是短文，以下設定將兩段短文依原順序堆在同一右欄：

```json
{
  "schema": "lumareader.agent/v1",
  "options": {
    "pageSize": "A4",
    "orientation": "landscape",
    "fontSize": 14,
    "colorFrame": true,
    "pageNumbers": true,
    "numberStart": 2
  },
  "placements": [
    { "blocks": [3, 4], "target": 2, "position": "right" }
  ],
  "styles": [
    { "blocks": [3, 4], "fontSize": 12, "align": "left" }
  ],
  "columns": [
    { "block": 2, "weights": [2, 1], "dividers": [true] }
  ]
}
```

```sh
LUMA --luma-agent export "文章.md" --output "報告.pdf" --layout "排版.json"
```

`position` 支援 `left`、`right`、`above`、`below`。`below` 把內容接在目標所在欄的下方，不另開一欄。`blocks`／`target` 可使用索引或 inspect 回傳的穩定 ID。最多三欄，`weights` 調整欄寬比例，`dividers` 個別設定分隔線。

`styles` 支援 8–36 px 的 `fontSize`、`left`／`center`／`right`／`justify` 對齊，以及 0–600 px 的 `spaceBefore`。整份文字 `options.fontSize` 為 8–22 px。其餘 `options` 包含 `inset`（6／10／14 mm）、`includeFooter`、`footerText`、`rules`、`blockGap`（0–24 px）、`ruleGap`（0–20 px）。

可在 JSON 加入 inspect 回傳的 `sourceHash`；文件被修改後，匯出會拒絕舊設定，要求重新 inspect。也可明確指定 App 原有 schema v2 的排版 JSON，沿用該稿文字與排版；指令不會自動讀取或改寫使用者 App 的排版快取。

## 圖片及輸出檢查

本機圖片沿用 MD 原本的相對路徑，不需另行上傳。預設讀取範圍是 MD 所在資料夾。若文件使用 `../images/`，指定包含 MD 與圖片的專案資料夾：

```sh
LUMA --luma-agent export "專案/notes/文章.md" --output "報告.pdf" --root "專案"
```

遠端圖片預設不連線；需要 http／https 圖片時加上 `--allow-remote-images`。圖片讀取失敗時預設停止，不留下宣稱成功但缺圖的 PDF；若確實接受缺圖，可加 `--allow-missing-images`，並檢查回應的 `warnings`。

Agent 應檢查退出碼及 `ok`，並在較複雜的文件輸出後檢視 PDF 頁面，核對內容、圖像、表格和排版。預覽與 App 共用字型、文字渲染、分頁及原生 PDF 引擎，沒有另外製作一套報表樣式。

MD、目前視窗及 App 偏好設定都不會被指令更改。每次工作使用獨立的隱藏視窗、暫存資料與授權的本機服務，完成後清理；不掃描整個資料庫。一次工作上限 120 秒，MD 最多 2 MB／500,000 字元，PDF 最多 64 MB。

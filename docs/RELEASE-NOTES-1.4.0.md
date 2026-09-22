# Kainnne LumaReader 1.4.0

## 繁體中文

- 直接編輯成為預設：點排好版的文字或表格即可修改。開啟「顯示 Markdown」會顯示原文與對照預覽，取消後回到直接編輯。
- 格式選單預設提供功能名稱與用途說明，也能勾選精簡顯示。直接編輯支援表格列欄操作、格式復原、圖片插入與放大。
- 修正獨立公式在閱讀與編輯時對齊不同的問題，改善多層分數的顯示。
- 桌面選圖使用非同步視窗與等待提示，避免重複開啟；實際開啟時間仍依作業系統和檔案位置而異。
- 桌面版新增 Python、C、C++、JavaScript、TypeScript 等常見程式碼檔案的語法上色、行號與基本編輯。格式預設未勾選，檔案預設唯讀，每次編輯需自行開啟；不會執行程式。
- 網頁版同步更新直接編輯與「顯示 Markdown」開關，保留最多 3 份文件、分享及暫存使用方式。

較複雜、未支援直接編輯的 Markdown 區塊會保留原文，並提供原文編輯入口；修改支援的區塊時可能整理該區塊的 Markdown 語法。超過 500,000 字元的 Markdown 使用原文編輯；程式碼檔案上限 1 MB，超過 200,000 字元暫停語法上色。

macOS 為粉紅色正式圖示、Universal 版本，使用 Developer ID 簽章與 Apple 公證。Windows 為未簽署的 x64 安裝版及免安裝版，可能出現 SmartScreen 或「未知的發行者」提示。Linux 提供 x64 AppImage 與 .deb。程式不會自行更改 Markdown 預設開啟方式。

## English

- Edit formatted text and table cells directly by default. Enable **Show Markdown** for source and comparison preview; disable it to return to direct editing.
- Formatting tools include names and explanations, with optional compact labels. Direct editing supports table row/column operations, formatting undo, image insertion and zoom.
- Display formulas now align consistently in reading and editing, including nested fractions.
- Desktop image selection uses an asynchronous native panel with visible progress and duplicate-request protection. OS and file-location latency can still vary.
- Desktop adds highlighted, line-numbered reading and basic editing for Python, C, C++, JavaScript and TypeScript files. Code formats are opt-in; each document opens read-only until editing is enabled. No code is executed.
- Web receives the direct editor and Show Markdown toggle while retaining its three-document session and sharing behavior.

Unsupported direct-editing blocks retain their source and offer source editing. Editing supported blocks may normalize their Markdown syntax. Markdown above 500,000 characters uses source editing. Code files are limited to 1 MB, with syntax parsing paused above 200,000 characters.

macOS: pink production icon, Universal, Developer ID signed and Apple notarized. Windows: unsigned x64 Setup and Portable; SmartScreen or Unknown Publisher warnings may appear. Linux: x64 AppImage and .deb. Existing OS default-app choices remain under user control.

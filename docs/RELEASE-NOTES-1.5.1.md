# Kainnne LumaReader 1.5.1

## 繁體中文

- 修正桌面本機檔案服務的錯誤處理。空圖片／資源不再建立無效的讀取範圍；讀檔途中失敗或視窗取消載入時，會處理並釋放該串流，避免未處理的錯誤影響其他文件或主程序。
- 回應已開始傳送後發生錯誤時，只結束該回應，不會再次送出標頭而造成另一個主程序錯誤。
- 新增有容量限制的本機開檔診斷紀錄，只儲存版本、時間與錯誤代碼，不包含文件名稱、路徑、內容、網址或存取 token。讀寫診斷紀錄失敗不影響開檔。
- 1.5.0 的閱讀、編輯、PDF 排版、Agent 指令與介面維持原樣。

已重現 1.5.0 在空資源與讀取失敗情境的主程序錯誤。使用者回報的 `ERR_FAILED (-2)` 在重新啟動後已恢復，但原事故的完整觸發條件尚未重現；這次修補處理已確認的漏洞，診斷紀錄供後續確認其他載入失敗使用。

## English

- Confine desktop file-stream failures to their individual requests. Empty resources no longer create an invalid read range; failed or cancelled reads release their streams without an unhandled error affecting the main process or other documents.
- Close an interrupted response instead of writing its headers twice.
- Add bounded, local opening diagnostics containing only timestamps, versions and error codes. Document names, paths, contents, URLs and access tokens are excluded; diagnostic storage failures never block opening.
- Keep the 1.5.0 interface, reading, editing, PDF layout and Agent CLI unchanged.

The empty-resource and failed-read defects were reproduced in 1.5.0. The reported `ERR_FAILED (-2)` recovered after restarting; its original complete trigger has not been reproduced. This patch addresses confirmed defects and records any remaining load failures for diagnosis.

macOS packages are Developer ID signed, notarized and stapled. Windows x64 Setup and Portable remain unsigned. Linux provides x64 AppImage and .deb.

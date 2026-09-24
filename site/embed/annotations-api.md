# LumaReader 嵌入註記 v1

提供於 `1.4.1-web.10`，沿用 `lumareader-embed-v1`。預設不開啟，不影響既有安裝 HTML、編輯器或草稿。

## 操作概念

一則註記綁定一段文字，種類為 `highlight`、`comment` 或 `attachment`。Reader 維護位置、原文變動狀態與原生 Undo／Redo；宿主決定素材來源、生成、權限、計費與永久儲存。圖片以 `{id, local?, url?}` 與正文分開保存，URL 必須是無帳密的 HTTPS；不將 base64 或素材標記寫進 Markdown。

```js
import { mountLumaReader } from 'https://lumareader.kainnne.com/embed/lumareader.js';
const editor = mountLumaReader(container, {
  document: savedSnapshot, // {id, title, markdown} 或完整快照
  language: 'zh-Hant',
  features: { annotations: true },
  onSave: snapshot => saveSnapshotToYourBackend(snapshot)
});
await editor.ready;
```

不提供 `selectionActions` 時，反白後顯示 Reader 內建「重點／註解／圖片註記」。圖片註記可直接拖入或選擇檔案，不必輸入素材 ID。滑過標記可看圖片或備註，點選可管理；文字備註可修改，註記可刪除。頂端不顯示註記數字；需要確認的項目集中在設定的「待確認的註記」。刪除、修改註記也可 Undo／Redo。若需重新定位，先保留註記資料、請使用者重新選取，再以新的選取建立註記並移除舊項目。

第一版僅支援 `mode:'direct'`，啟用後關閉 Markdown 原文切換。`readOnly:true` 鎖定正文，仍可加註記；`annotationReadOnly:true` 則禁止修改註記。兩者獨立。超過 500,000 字元的文件走既有原文模式，註記 API 回報 `ANNOTATIONS_UNAVAILABLE`，不假裝可定位。

## 圖片與自己的後台

內建圖片註記支援 PNG、JPG、GIF、WebP，每張上限 8 MiB；本機圖片存於 iframe 所屬網站的 IndexedDB，該儲存區上限 64 MiB。資料不自動上傳；清除網站資料後圖片也會移除。跨裝置或正式後台流程請在儲存時匯出圖片：

```js
const snapshot = await editor.getDocument();
for (const note of snapshot.annotations?.items || []) {
  if (note.asset?.local) {
    const {id, type, bytes} = await editor.getAttachment(note.asset.id);
    await uploadImageToYourBackend(id, new Blob([bytes], {type}));
  }
}
// 接著一起保存完整快照。後台載入時可為 asset 提供你自己的 HTTPS URL。
await saveSnapshotToYourBackend(snapshot);
```

`getAttachment(id)` 僅接受目前文件註記引用的圖片 ID，回傳 `{id,type,bytes:Uint8Array}`；不是任意讀取其他文件或本機路徑。若網站有多份草稿需永久保存，應在每份草稿仍為目前文件時保存它的附件。註記選圖不等於把圖片插入 Markdown：前者只新增外部註記，後者仍可由原本的格式工具執行。

嵌入版設定預設位於左側「匯入 Markdown」旁，儲存在右上角。若宿主指定 `features.sidebar:false`，設定留在頂端以維持可操作。`features.settings:false` 可一起關閉。以下擴充介面可接聲音、影片段落、任務或其他後台資料；Reader 不新增業務專用欄位。

## 接自己的選圖流程

```js
const editor = mountLumaReader(container, {
  document: savedSnapshot,
  features: { annotations: true },
  selectionActions: [
    { id: 'image', label: '加入圖片', icon: 'image' },
    { id: 'emphasis', label: '強調重點', icon: 'highlight' }
  ],
  async onAction({ actionId, selection }) {
    const annotation = actionId === 'image'
      ? { kind: 'attachment', label: '段落配圖', asset: await chooseAsset() }
      : { kind: 'highlight', label: '重點' };
    try {
      await editor.addAnnotation({
        ...selection,
        expectedRevision: selection.revision,
        annotation
      });
    } catch (error) {
      // 選圖期間改稿、換文件或重載：請重新選取，不自動重試到別句。
      showSelectionNeedsConfirmation(error.code);
    }
  },
  onSave: snapshot => saveSnapshotToYourBackend(snapshot)
});
```

`chooseAsset()` 由宿主實作，回傳 `{id:'your-asset-id',url:'https://…'}`。可以先建立不含 URL 的 attachment，待生成完成再更新；更新前仍需驗證最新文件、註記 ID 與狀態，不能只取最新 revision 後盲目重試。

`selectionActions` 最多 5 個、ID 唯一、label 最多 32 字元；icon 限 `image | highlight | comment`。指定 actions 後全部交給 `onAction`，不會混入另一套工具；傳 `[]` 可只用宿主外部按鈕及 SDK。按鈕、標籤和註解內容不接受 HTML。

## 選取與原文範圍

`onSelectionChange(selection)` 與 `await editor.getSelection()` 回傳：

```js
{
  sessionId, id, activeFileId, revision,
  canAnnotate, reason?, selectedText, selectionToken,
  sourceRanges: [{from, to}] | null,
  offsetEncoding: 'UTF-16', sourceMapping: 'exact' | 'unavailable'
}
```

- `selectionToken` 是 Reader 內部 bookmark，不是原文偏移；最多保留最近 32 次有效選取。同一份正文與 revision 內可跨外部視窗使用；修改文字或註記、換檔、重載後須重新確認。
- 原文範圍為 `[from,to)`，對應同一 revision 的 `getDocument().markdown`。一個反白可回傳多段範圍，例如跨粗體、連結、段落、清單與表格；範圍只包含對應文字的原文片段，並非把中間 Markdown 語法一併當文字。
- Reader 由原生節點及序列化邊界建立映射，並逐一核對已知區塊的完整原文，不搜尋 `selectedText`。兩次出現相同句子不會混淆。
- **映射採保守策略**：原文區塊與 Reader 序列化格式不同（例如另一種強調符號、非標準表格間距、部分跳脫／CRLF 組合）時，`sourceRanges:null`。原生 anchor 仍可加註記，但宿主不能自行以 `indexOf` 補猜原文範圍。需要絕對原文索引的流程應要求重新整理格式或使用註記 ID。
- 非文字選取、公式、圖片、特殊語法節點、整格表格選取及切斷 emoji／組合字元的選取明確拒絕；最多選取 10,000 UTF-16 單位。

## 註記 API

`editor.capabilities.annotations` 提供版本、支援模式、大小限制、是否啟用與可寫狀態。

```js
const context = await editor.getAnnotations();
// {sessionId, id, activeFileId, revision, annotations}

await editor.updateAnnotation({
  ...context, expectedRevision: context.revision,
  annotationId, patch: {label: '配圖已完成', asset: {id: assetId, url}}
});

await editor.deleteAnnotation({
  ...context, expectedRevision: context.revision, annotationId
});

// 回復完整側錄必須與當前正文指紋完全相符；不做模糊比對。
await editor.setAnnotations({
  ...context, expectedRevision: context.revision, annotations: savedAnnotations
});
```

每次新增、更新、刪除、批次設定都需要 `sessionId / id / activeFileId / expectedRevision`。必須以先前讀取的快照核對；revision 是整個工作區的版本，其他註記改變也會讓舊請求失效。`addAnnotation` 另需 `selectionToken`，返回 `{sessionId,id,activeFileId,revision,annotation}`。其餘修改返回最新 context 與 annotations。沒有熱替換正文 API；先 save → destroy → mount。

註記項目包含 `id,kind,label,body,asset?,data?,anchor,status`；ID 不指定時自動產生。`anchor` 是 Reader 所有的持久化定位資料，宿主不應解讀或修改內部位置。

- `active`：原文字串未改變，插入前文後位置仍有效。
- `needsReview`：被標記文字改變；保留原始引文與當前位置，需人工確認。拒絕將新的生成圖片直接套上此狀態。
- `orphaned`：原文被刪除、文件在 Reader 外更動而無法確認、或範圍超出限制。保留註記但不在可能錯誤的位置畫標記。

位置和狀態與文字 transaction 一起進入原生歷程，Undo／Redo 會一併恢復。剪下後貼到別處不會猜測為搬移；舊註記可能失去定位，需重新選取。正文指紋用於完整性檢查，不是安全憑證；權限仍須由後台管理。

`onAnnotationsChange({sessionId,id,activeFileId,revision,annotations})` 通知內容／位置變動；`onAnnotationClick({...context,annotation})` 通知點選。`onAction({actionId,selection})` 通知宿主自訂動作。文件切換時以 `onChange` 的 `activeFileId` 為準，重新取目前註記，不沿用前一份的 context。

常見錯誤碼：`STALE_SESSION`、`STALE_REVISION`、`STALE_SELECTION`、`DOCUMENT_MISMATCH`、`ANCHOR_REQUIRES_REVIEW`、`DOCUMENT_FINGERPRINT_MISMATCH`、`ANCHOR_MISMATCH`、`ANNOTATIONS_DISABLED`、`ANNOTATIONS_UNAVAILABLE`、`ANNOTATIONS_READ_ONLY`。失效的非同步生成結果請保留素材供使用者重選，不悄悄移到別段。

## 保存、回復與限制

`getDocument()`／`onSave` 的快照在每份 `files[i]` 附上 `annotations`，頂層同時提供當前文件的 annotations。`getActiveDocument()` 只回傳目前正文與註記，不合併其他草稿。新增欄位向後相容；舊整合若丟棄 annotations，就不會保存註記。

正文與 annotations 必須**一起儲存同一份快照**，`await editor.save()` 成功後才進下一步。保存失敗保留正文及註記，`destroy()` 拒絕丟棄未保存內容。固定安裝 loader 會將完整快照存入原有瀏覽器草稿；後台永久儲存仍由宿主負責。下載 `.md` 僅含正文；備份註記請另存完整 JSON。重新載入會核對正文指紋、解析後的節點結構指紋及選段內容，無法核對就保留為 orphaned。

每份文件最多 200 則註記，整份側錄最多 1 MiB；label 120 字元、body 4,000 字元、宿主 data 最多 4 KiB JSON。URL 只用於圖片呈現，Reader 不負責上傳／生成素材。既有 origin、source、channel、boot 驗證與 iframe sandbox 維持不變。

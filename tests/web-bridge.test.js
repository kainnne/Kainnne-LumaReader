const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadWebBridge(hash = "", remoteFetch = async () => new Response("Not found", { status: 404 }), navigatorOptions = {}) {
  const storage = new Map();
  const location = { href: `https://example.test/web/${hash}`, origin: "https://example.test", pathname: "/web/", hash };
  const window = {
    addEventListener() {},
    fetch: remoteFetch,
  };
  const context = vm.createContext({
    Blob,
    CompressionStream,
    DecompressionStream,
    Request,
    Response,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    URL,
    URLSearchParams,
    atob,
    btoa,
    clearTimeout,
    console,
    location,
    navigator: { language: "en", ...navigatorOptions },
    setTimeout,
    localStorage: {
      getItem(key) { return storage.get(key) ?? null; },
      setItem(key, value) { storage.set(key, String(value)); },
    },
    window,
  });
  const source = fs.readFileSync(path.join(__dirname, "../site/web/web-bridge.js"), "utf8");
  vm.runInContext(source, context);
  return window;
}

function markdownFile(name) {
  return { name, type: "text/markdown", text: async () => `# ${name}\n` };
}

test("web session keeps three documents and queues the rest", async () => {
  const window = loadWebBridge();
  const result = await window.lumaWeb.importFiles([
    markdownFile("One.md"),
    markdownFile("Two.md"),
    markdownFile("Three.md"),
    markdownFile("Four.md"),
  ]);

  assert.equal(result.count, 3);
  assert.equal(result.limit, 3);
  assert.equal(result.pendingFiles.length, 1);
  assert.equal(result.pendingFiles[0].name, "Four.md");
  assert.equal(result.files.some((file) => file.webSample), false);

  const removed = window.lumaWeb.removeDocument("One.md");
  assert.equal(removed.ok, true);
  assert.equal(removed.count, 2);

  const resumed = await window.lumaWeb.importFiles(result.pendingFiles);
  assert.equal(resumed.count, 3);
  assert.equal(resumed.pendingFiles.length, 0);
  assert.equal(resumed.files.some((file) => file.name === "Four.md"), true);
});

test("web save remains in the session instead of downloading a copy", async () => {
  const window = loadWebBridge();
  await window.lumaWeb.importFiles([markdownFile("Draft.md")]);
  const result = await window.lumaDesktop.saveDocument({ path: "Draft.md", text: "# Revised\n" });

  assert.equal(result.ok, true);
  assert.equal(result.sessionOnly, true);
  assert.equal(result.downloaded, undefined);
  assert.equal(result.document.text, "# Revised\n");
});

test("web share links carry the current Markdown into a new reader", async () => {
  const sourceWindow = loadWebBridge();
  await sourceWindow.lumaWeb.ready;
  const shared = await sourceWindow.lumaWeb.createShareUrl({ name: "分享測試.md", text: "# 給朋友看的內容\n\nHello!\n" });

  assert.equal(shared.ok, true);
  assert.match(shared.url, /^https:\/\/example\.test\/web\/#share=/);

  const targetWindow = loadWebBridge(new URL(shared.url).hash);
  const ready = await targetWindow.lumaWeb.ready;
  assert.equal(ready.imported, true);
  assert.equal(targetWindow.lumaWeb.sessionInfo().count, 1);

  const response = await targetWindow.fetch(`/api/file?path=${encodeURIComponent("分享測試.md")}`);
  const document = await response.json();
  assert.equal(document.name, "分享測試.md");
  assert.equal(document.text, "# 給朋友看的內容\n\nHello!\n");
});

test("web sharing prefers the temporary Cloudflare short link", async () => {
  const window = loadWebBridge("", async (url, options) => {
    assert.equal(url, "https://lumareader-share.chaos60649.workers.dev/api/shares");
    assert.equal(options.method, "POST");
    const body = JSON.parse(options.body);
    assert.match(body.target, /^https:\/\/example\.test\/web\/#share=/);
    assert.equal(body.title, "Release Notes");
    assert.equal(body.description, "A concise summary for the preview.");
    return new Response(JSON.stringify({
      ok: true,
      url: "https://lumareader-share.chaos60649.workers.dev/s/Ab3xK9pq",
      expiresAt: "2026-09-26T00:00:00.000Z",
    }), { status: 201, headers: { "Content-Type": "application/json" } });
  });
  const shared = await window.lumaWeb.createShareUrl({
    name: "Release Notes.md",
    text: "# Release Notes\n\nA concise summary for the preview.\n",
  });

  assert.equal(shared.shortened, true);
  assert.equal(shared.url, "https://lumareader-share.chaos60649.workers.dev/s/Ab3xK9pq");
});

test("the default web example offers an interface trial and direct Desktop downloads in both languages", async () => {
  const window = loadWebBridge();
  await window.lumaWeb.ready;
  const response = await window.fetch(`/api/file?path=${encodeURIComponent("LumaReader Web.md")}`);
  const document = await response.json();

  assert.match(document.text, /^# LumaReader Web\n/);
  assert.match(document.text, /## Try the interface \/ 先體驗介面/);
  assert.match(document.text, /Download LumaReader Desktop \/ 下載 LumaReader 桌面版/);
  assert.match(document.text, /## Read your way \/ 用喜歡的方式閱讀/);
  assert.match(document.text, /不必將文件上傳到伺服器/);
});

test("sharing the unchanged built-in example reuses the permanent Web address", async () => {
  const window = loadWebBridge();
  await window.lumaWeb.ready;
  const response = await window.fetch(`/api/file?path=${encodeURIComponent("LumaReader Web.md")}`);
  const document = await response.json();
  const shared = await window.lumaWeb.createShareUrl({ name: document.name, text: document.text });

  assert.equal(shared.ok, true);
  assert.equal(shared.canonical, true);
  assert.equal(shared.url, "https://example.test/web/");
});

test("Web detects the preferred platform while the demo always offers all operating systems and the homepage", async (t) => {
  const cases = [
    [{ platform: "MacIntel", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", maxTouchPoints: 0 }, "macos"],
    [{ platform: "Win32", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }, "windows"],
    [{ platform: "Linux x86_64", userAgent: "Mozilla/5.0 (X11; Linux x86_64)" }, "linux"],
    [{ userAgentData: { platform: "macOS", mobile: false } }, "macos"],
    [{ platform: "MacIntel", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", maxTouchPoints: 5 }, null],
    [{ platform: "Linux armv8l", userAgent: "Mozilla/5.0 (Linux; Android 16) Mobile" }, null],
    [{ platform: "Linux aarch64", userAgent: "Mozilla/5.0 (X11; Linux aarch64)" }, null],
    [{ platform: "Linux x86_64", userAgent: "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0)" }, null],
    [{ platform: "iPhone", userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X)" }, null],
    [{}, null],
  ];
  for (const [navigatorOptions, platform] of cases) {
    await t.test(JSON.stringify(navigatorOptions), async () => {
      const window = loadWebBridge("", undefined, navigatorOptions);
      await window.lumaWeb.ready;
      assert.equal(window.lumaWeb.preferredDesktopDownload?.platform ?? null, platform);
      const response = await window.fetch(`/api/file?path=${encodeURIComponent("LumaReader Web.md")}`);
      const document = await response.json();
      const downloadSection = document.text.split("## Download LumaReader Desktop")[1];
      assert.ok(downloadSection);
      assert.doesNotMatch(document.text, /\(\.\.\/#download\)/);
      const links = [...downloadSection.matchAll(/https:\/\/lumareader-share\.chaos60649\.workers\.dev\/d\/(macos|windows|linux)/g)].map((match) => match[1]);
      assert.deepEqual(links, ["macos", "windows", "linux"]);
      assert.match(downloadSection, /Choose your operating system \/ 選擇你的作業系統/);
      assert.match(downloadSection, /\[LumaReader home \/ 返回 LumaReader 首頁\]\(https:\/\/lumareader\.kainnne\.com\/\)/);
    });
  }
});

function imageFile(name, relativePath = name, size = 8) {
  const file = new Blob([new Uint8Array(size)], {type:'image/png'});
  Object.defineProperties(file, {name:{value:name},webkitRelativePath:{value:relativePath}});
  return file;
}

test('local images resolve folder paths, Unicode, parent paths and absolute paths without network access', async () => {
  let requests = 0;
  const w = loadWebBridge('', async () => { requests++; throw Error('No network expected'); });
  await w.lumaWeb.ready;
  const md = {...markdownFile('筆記.md'), webkitRelativePath:'專案/docs/筆記.md'};
  await w.lumaWeb.importFiles([md, imageFile('圖 一.png', '專案/assets/圖 一.png')]);
  const from = '專案/docs/筆記.md';
  const url = w.lumaWeb.mediaUrl('../assets/%E5%9C%96%20%E4%B8%80.png', from);
  assert.match(url, /^blob:/);
  for (const raw of ['../assets/圖 一.png','file:///Users/person/專案/assets/圖%20一.png','C:\\專案\\assets\\圖 一.png']) assert.equal(w.lumaWeb.mediaUrl(raw,from),url);
  assert.equal(w.lumaWeb.mediaUrl('private/missing.png',from),'');
  assert.equal(w.lumaWeb.mediaUrl('broken%name.png',from),'');
  assert.equal(w.lumaWeb.mediaUrl('javascript:alert(1)',from),'');
  assert.equal(requests,0);
  const doc = await (await w.fetch('/api/file?path='+encodeURIComponent(from))).json();
  assert.equal(doc.text,'# 筆記.md\n');
});

test('matching duplicate image names uses folders and never chooses an ambiguous basename', async () => {
  const w=loadWebBridge(); await w.lumaWeb.ready;
  await w.lumaWeb.importFiles([markdownFile('Draft.md')]);
  await w.lumaWeb.importAssets([imageFile('same.png','root/a/same.png'),imageFile('same.png','root/b/same.png')]);
  assert.equal(w.lumaWeb.mediaInfo('same.png','Draft.md').ambiguous,true);
  assert.equal(w.lumaWeb.mediaUrl('same.png','Draft.md'),'');
  const a=w.lumaWeb.mediaUrl('a/same.png','Draft.md'),b=w.lumaWeb.mediaUrl('b/same.png','Draft.md');
  assert.match(a,/^blob:/);assert.match(b,/^blob:/);assert.notEqual(a,b);
});

test('media-only imports refresh a session, preserve documents, report progress and support cancellation', async () => {
  const w=loadWebBridge(); await w.lumaWeb.ready;
  await w.lumaWeb.importFiles([markdownFile('Draft.md')]);
  assert.equal(w.lumaWeb.mediaUrl('photo.png','Draft.md'),'');
  const imported=await w.lumaWeb.importFiles([imageFile('photo.png')]);
  assert.equal(imported.assetsAdded,1);assert.equal(imported.count,1);assert.equal(imported.path,'');
  assert.match(w.lumaWeb.mediaUrl('photo.png','Draft.md'),/^blob:/);
  const progress=[],controller=new AbortController();
  const result=await w.lumaWeb.importAssets(Array.from({length:120},(_,i)=>imageFile(`image-${i}.png`)),{signal:controller.signal,onProgress:p=>{progress.push(p.processed);controller.abort();}});
  assert.equal(result.assetsAdded,50);assert.equal(result.canceled,true);assert.deepEqual(progress,[50]);
  const large={name:'large.png',type:'image/png',size:33*1024*1024};
  assert.equal((await w.lumaWeb.importAssets([large])).assetsSkipped,1);
});

test('remote and sample images keep their URL base while missing local paths never become public requests', async () => {
  const w=loadWebBridge('',async()=>new Response('# Remote\n\n![Photo](./images/a.png)'));
  await w.lumaWeb.ready;
  assert.equal(w.lumaWeb.mediaUrl('../icon-content.webp','LumaReader Web.md'),'https://example.test/icon-content.webp');
  const remote=await (await w.fetch('/api/open?source='+encodeURIComponent('https://docs.test/folder/note.md'))).json();
  assert.equal(w.lumaWeb.mediaUrl('./images/a.png',remote.path),'https://docs.test/folder/images/a.png');
  await w.lumaWeb.importFiles([markdownFile('Local.md')]);
  assert.equal(w.lumaWeb.mediaUrl('/Users/me/private.png','Local.md'),'');
  assert.equal(w.lumaWeb.mediaUrl('https://images.test/a.png','Local.md'),'https://images.test/a.png');
});

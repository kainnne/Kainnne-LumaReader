const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

async function loadTour(source) {
  const elements = new Map(), storage = new Map(), timers = new Map();
  let nextTimer = 0, now = 0, saved = {};
  class Element extends EventTarget {
    constructor() {
      super(); this.hidden = true; this.value = "en"; this.style = {};
      const classes = new Set();
      this.classList = { add: (value) => classes.add(value), remove: (value) => classes.delete(value) };
    }
    setAttribute() {}
    querySelectorAll() { return []; }
    replaceChildren() {}
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 30 }; }
    focus() {}
    click() { this.dispatchEvent(new Event("click")); }
  }
  const document = new EventTarget();
  document.body = new Element();
  document.querySelector = (selector) => {
    if (!elements.has(selector)) elements.set(selector, new Element());
    return elements.get(selector);
  };
  document.querySelectorAll = () => [];
  document.createElement = () => new Element();
  const window = new EventTarget();
  window.lumaDesktop = { getPreferences: async () => ({ ...saved }), setPreferences: async (patch) => { saved = { ...saved, ...patch }; } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", source), "utf8"), {
    window, document, CustomEvent, innerWidth: 1360, innerHeight: 880,
    localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)) },
    requestAnimationFrame: (callback) => callback(),
    setTimeout: (callback, delay) => { const id = ++nextTimer; timers.set(id, { callback, at: now + delay }); return id; },
    clearTimeout: (id) => timers.delete(id),
    console,
  }, { filename: source });
  await window.LumaReaderUI.ready;
  return {
    ui: window.LumaReaderUI, elements, storage,
    saved: () => saved,
    advance(milliseconds) {
      const end = now + milliseconds;
      while (true) {
        const next = [...timers.entries()].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        now = next[1].at; timers.delete(next[0]); next[1].callback();
      }
      now = end;
    },
  };
}

for (const source of ["renderer/multiformat-ui.js", "site/web/multiformat-ui.js"]) {
  test(`${source}: skipping a manually opened tour before the startup timer does not reopen it`, async () => {
    const tour = await loadTour(source);
    tour.ui.startTour({ step: 4 });
    tour.elements.get("#onboarding-skip").click();
    assert.equal(tour.elements.get("#onboarding").hidden, true);
    tour.advance(1000);
    assert.equal(tour.elements.get("#onboarding").hidden, true);
    assert.equal(tour.ui.getState().tourStep, -1);
    assert.equal(tour.saved().onboardingVersion, 5);
  });
  test(`${source}: automatic startup cannot reset an active manual tour to step zero`, async () => {
    const tour = await loadTour(source);
    tour.ui.startTour({ step: 4 });
    tour.advance(1000);
    assert.equal(tour.ui.getState().tourStep, 4);
  });
  test(`${source}: startup timer rechecks completion before opening`, async () => {
    const tour = await loadTour(source);
    tour.storage.set("lumareader-onboarding-version", "5");
    tour.advance(1000);
    assert.equal(tour.elements.get("#onboarding").hidden, true);
  });
  test(`${source}: fresh users still receive the automatic tour`, async () => {
    const tour = await loadTour(source);
    tour.advance(279);
    assert.equal(tour.elements.get("#onboarding").hidden, true);
    tour.advance(1);
    assert.equal(tour.elements.get("#onboarding").hidden, false);
    assert.equal(tour.ui.getState().tourStep, 0);
  });
}

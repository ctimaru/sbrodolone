const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const script = fs.readFileSync(path.join(root, "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");

function fixture({ ready = true } = {}) {
  const dom = new JSDOM(html, {
    url: "https://example.test/sbrodolone/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  const { document } = window;
  const observers = [];
  const NativeObserver = window.MutationObserver;
  window.MutationObserver = class extends NativeObserver {
    constructor(callback) {
      super(callback);
      observers.push(this);
    }
  };
  const timers = new Map();
  let timerId = 0;
  let calls = [];
  window.setTimeout = (fn, ms) => {
    timers.set(++timerId, { fn, ms, repeat: false });
    return timerId;
  };
  window.setInterval = (fn, ms) => {
    timers.set(++timerId, { fn, ms, repeat: true });
    return timerId;
  };
  window.clearTimeout = window.clearInterval = (id) => timers.delete(id);
  const provider = (options) => calls.push(options);
  if (ready) window.glfOpenWidget = provider;
  window.eval(script);
  const buttons = [...document.querySelectorAll("[data-order]")];
  const loading = document.querySelector("#order-loading");
  const page = document.querySelector("#site-content");
  return {
    window,
    document,
    buttons,
    loading,
    page,
    calls,
    timers,
    click(index = 0, options = {}) {
      buttons[index].dispatchEvent(
        new window.MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          ...options,
        }),
      );
    },
    provide() {
      window.glfOpenWidget = provider;
    },
    tick(ms) {
      for (const [id, timer] of [...timers])
        if (timer.ms === ms) {
          if (!timer.repeat) timers.delete(id);
          timer.fn();
        }
    },
    async frame() {
      const frame = document.createElement("iframe");
      frame.id = "gfOrderFrm";
      document.body.append(frame);
      await new Promise((resolve) => setImmediate(resolve));
      frame.dispatchEvent(new window.Event("load"));
      return frame;
    },
    close() {
      observers.forEach((observer) => observer.disconnect());
      dom.window.close();
    },
  };
}

test("HTML: language, one h1, unique IDs, valid local assets and anchor targets", () => {
  const { window } = new JSDOM(html);
  const doc = window.document;
  assert.equal(doc.documentElement.lang, "it");
  assert.equal(doc.querySelectorAll("h1").length, 1);
  const ids = [...doc.querySelectorAll("[id]")].map((el) => el.id);
  assert.equal(ids.length, new Set(ids).size);
  for (const el of doc.querySelectorAll("[src], [href], source[srcset]")) {
    const url =
      el.getAttribute("src") ||
      el.getAttribute("href") ||
      el.getAttribute("srcset");
    if (url.startsWith("#")) assert.ok(doc.getElementById(url.slice(1)), url);
    else if (!/^(https?:|data:)/.test(url))
      assert.ok(fs.existsSync(path.join(root, url.split("?")[0])), url);
  }
  const embed = [...doc.scripts].filter((s) => s.src.includes("ewm2.js"));
  assert.equal(embed.length, 1);
  for (const link of doc.querySelectorAll("[data-order]")) {
    const url = new URL(link.href);
    assert.equal(
      url.searchParams.get("company_uid"),
      "671be21d-504f-4a54-bc45-8f9c8567171b",
    );
    assert.equal(
      url.searchParams.get("restaurant_uid"),
      "af5399bf-9d5e-4481-9478-f7eadf473ca8",
    );
  }
  assert.ok(doc.querySelector('img[fetchpriority="high"][width][height]'));
  window.close();
});

test("CSS parses and includes responsive, safe-area and reduced-motion rules", () => {
  const { window } = new JSDOM("<style></style>");
  window.document.querySelector("style").textContent = css;
  assert.ok(window.document.styleSheets[0].cssRules.length > 50);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /max-width:\s*640px/);
  assert.match(css, /scroll-padding-bottom/);
  window.close();
});

test("all three CTAs open the correct restaurant once and immediately show feedback", () => {
  for (let index = 0; index < 3; index++) {
    const f = fixture();
    f.click(index);
    f.click(index);
    f.click((index + 1) % 3);
    assert.equal(f.calls.length, 1);
    assert.equal(
      f.calls[0].restaurantUID,
      "af5399bf-9d5e-4481-9478-f7eadf473ca8",
    );
    assert.equal(f.calls[0].companyUID, "671be21d-504f-4a54-bc45-8f9c8567171b");
    assert.equal(f.calls[0].forceMode, "desktop");
    assert.equal(f.loading.hidden, false);
    assert.equal(f.page.inert, true);
    assert.equal(f.document.activeElement, f.loading);
    f.close();
  }
});

test("frame load, close and reopen restore focus, scroll locking and button state", async () => {
  const f = fixture();
  f.document.body.style.overflow = "auto";
  f.click(2);
  const frame = await f.frame();
  assert.equal(f.loading.hidden, true);
  assert.equal(frame.title, "Menu e ordinazione — Sbrodolone");
  assert.equal(f.document.activeElement, frame);
  frame.remove();
  f.calls[0].closeHandler();
  assert.equal(f.page.inert, false);
  assert.equal(f.document.body.style.overflow, "auto");
  assert.equal(f.document.activeElement, f.buttons[2]);
  assert.equal(f.buttons[2].getAttribute("aria-busy"), "false");
  f.click(1);
  assert.equal(f.calls.length, 2);
  f.close();
});

test("late script becomes available without requiring a second click", () => {
  const f = fixture({ ready: false });
  f.click();
  assert.equal(f.calls.length, 0);
  assert.equal(f.loading.hidden, false);
  f.provide();
  f.tick(80);
  assert.equal(f.calls.length, 1);
  f.tick(80);
  assert.equal(f.calls.length, 1);
  f.close();
});

test("missing script exposes fallback and cancellation leaves no late opening", () => {
  const f = fixture({ ready: false });
  f.click();
  f.tick(12000);
  assert.match(
    f.document.querySelector("#loading-description").textContent,
    /nuova scheda/,
  );
  assert.equal(f.document.querySelector("#order-fallback").target, "_blank");
  f.document.querySelector("#loading-cancel").click();
  assert.equal(f.loading.hidden, true);
  assert.equal(f.page.inert, false);
  f.provide();
  f.tick(80);
  assert.equal(f.calls.length, 0);
  assert.equal(f.timers.size, 0);
  f.close();
});

test("Space opens once, loading traps Tab, and Escape cancels before transport starts", () => {
  const f = fixture({ ready: false });
  f.buttons[1].dispatchEvent(
    new f.window.KeyboardEvent("keydown", {
      key: " ",
      bubbles: true,
      cancelable: true,
    }),
  );
  assert.equal(f.loading.hidden, false);
  const cancel = f.document.querySelector("#loading-cancel");
  cancel.focus();
  cancel.dispatchEvent(
    new f.window.KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    }),
  );
  assert.equal(f.document.activeElement.id, "order-fallback");
  f.document.activeElement.dispatchEvent(
    new f.window.KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    }),
  );
  assert.equal(f.document.activeElement, cancel);
  f.loading.dispatchEvent(
    new f.window.KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    }),
  );
  assert.equal(f.loading.hidden, true);
  f.close();
});

test("capture handler prevents duplicate vendor click handler", () => {
  const f = fixture();
  let vendorClicks = 0;
  f.buttons[1].addEventListener("click", () => vendorClicks++);
  f.click(1);
  assert.equal(vendorClicks, 0);
  assert.equal(f.calls.length, 1);
  f.close();
});

test("modified clicks preserve external-link behavior", () => {
  const f = fixture();
  for (const modifier of ["ctrlKey", "metaKey", "shiftKey", "altKey"])
    f.click(0, { [modifier]: true });
  assert.equal(f.calls.length, 0);
  assert.equal(f.loading.hidden, true);
  f.close();
});

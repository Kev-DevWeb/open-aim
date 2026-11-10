// Performance diagnostics for player reports, without opening DevTools.
// F9: records a 5 s trace of the game page (main thread, JS samples, frames) and saves it,
//     gzipped, to Documents/AimTrainer-diagnostico. It opens in DevTools > Performance.
// Ctrl+Shift+L: light mode on/off. The page reloads without ui.css, the esports theme and
//     the injected UI scripts (main.js), to compare frame rates with and without them.
const { app, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const SECONDS = 5;
const CATEGORIES = [
  "devtools.timeline",
  "disabled-by-default-devtools.timeline",
  "disabled-by-default-devtools.timeline.frame",
  "v8.execute",
  "disabled-by-default-v8.cpu_profiler",
  "blink.user_timing",
  "gpu",
].join(",");

let recording = false;

function folder() {
  return process.env.AIM_DIAG_DIR || path.join(app.getPath("documents"), "AimTrainer-diagnostico");
}

function isLight(settings) {
  return settings.lightMode === true;
}

// A small notice at the top of the game page.
function toast(win, text, ms = 3000) {
  if (win.isDestroyed()) return;
  const source = `(() => {
    let el = document.getElementById("aim-diag-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "aim-diag-toast";
      el.style.cssText = "position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:2147483647;" +
        "padding:10px 18px;background:#111820ee;color:#fff;font:600 14px/1.3 sans-serif;border-left:4px solid #ff4655;" +
        "pointer-events:none;white-space:pre-line;text-align:center";
      document.documentElement.append(el);
    }
    el.textContent = ${JSON.stringify(text)};
    clearTimeout(el._hide);
    el._hide = setTimeout(() => el.remove(), ${ms});
  })()`;
  win.webContents.mainFrame.executeJavaScript(source).catch(() => {});
}

async function gpuInfo() {
  try {
    const info = await app.getGPUInfo("basic");
    return { devices: info.gpuDevice, features: app.getGPUFeatureStatus() };
  } catch {
    return null;
  }
}

async function record(win, settings) {
  if (recording || win.isDestroyed()) return null;
  const wc = win.webContents;
  if (wc.isDevToolsOpened()) {
    toast(win, "Close DevTools (F12) first, then press F9 again.");
    return null;
  }
  const dbg = wc.debugger;
  if (dbg.isAttached()) {
    toast(win, "Another tool is attached to this page. Restart the app and try again.");
    return null;
  }
  recording = true;
  const events = [];
  let finish;
  const complete = new Promise((resolve) => { finish = resolve; });
  const onMessage = (_event, method, params) => {
    if (method === "Tracing.dataCollected") events.push(...params.value);
    else if (method === "Tracing.tracingComplete") finish();
  };
  try {
    dbg.attach("1.3");
    dbg.on("message", onMessage);
    await dbg.sendCommand("Tracing.start", { categories: CATEGORIES, transferMode: "ReportEvents" });
    toast(win, `Recording performance for ${SECONDS} s.\nKeep playing as usual.`, SECONDS * 1000);
    await new Promise((resolve) => setTimeout(resolve, SECONDS * 1000));
    await dbg.sendCommand("Tracing.end");
    await Promise.race([complete, new Promise((resolve) => setTimeout(resolve, 20000))]);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const file = path.join(folder(), `trace-${stamp}.json.gz`);
    const report = {
      traceEvents: events,
      metadata: {
        app: app.getVersion(),
        electron: process.versions.electron,
        chrome: process.versions.chrome,
        lightMode: isLight(settings),
        vsync: settings.vsync === true,
        seconds: SECONDS,
        gpu: await gpuInfo(),
      },
    };
    fs.mkdirSync(folder(), { recursive: true });
    fs.writeFileSync(file, zlib.gzipSync(JSON.stringify(report)));
    toast(win, `Saved ${path.basename(file)}\nin Documents/AimTrainer-diagnostico`, 5000);
    if (!process.env.AIM_DIAG_DIR) shell.showItemInFolder(file);
    return file;
  } catch (err) {
    console.log(`DIAGNOSTICS: ${err}`);
    toast(win, `Recording failed: ${err.message}`, 5000);
    return null;
  } finally {
    dbg.removeListener("message", onMessage);
    try { if (dbg.isAttached()) dbg.detach(); } catch {}
    recording = false;
  }
}

// Returns true when the key was ours. save() writes the shell settings file.
function handleKey(win, input, settings, save) {
  if (input.key === "F9" && !input.control && !input.alt && !input.shift) {
    record(win, settings);
    return true;
  }
  if ((input.key === "L" || input.key === "l") && input.control && input.shift && !input.alt) {
    settings.lightMode = !isLight(settings);
    save();
    win.webContents.reload();
    // Shown after the reload, once the new page is there.
    win.webContents.once("did-finish-load", () => toast(win, settings.lightMode
      ? "Light mode ON: no theme or extra UI.\nPress Ctrl+Shift+L to turn it off."
      : "Light mode OFF: full interface."));
    return true;
  }
  return false;
}

module.exports = { isLight, handleKey, record };

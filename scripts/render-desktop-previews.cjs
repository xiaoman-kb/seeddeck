const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const electron = require("electron");

function relaunchAsElectronApp(electronPath) {
  if (process.env.SEEDDECK_DESKTOP_PREVIEW_CHILD) {
    throw new Error("Electron main-process APIs are unavailable in the preview child process.");
  }

  const tempApp = fs.mkdtempSync(path.join(os.tmpdir(), "seeddeck-preview-app-"));
  const mainFile = path.join(tempApp, "main.cjs");
  fs.copyFileSync(__filename, mainFile);
  fs.writeFileSync(
    path.join(tempApp, "package.json"),
    JSON.stringify({ name: "seeddeck-preview-app", main: "main.cjs" }, null, 2),
    "utf8",
  );

  const env = {
    ...process.env,
    SEEDDECK_DESKTOP_PREVIEW_CHILD: "1",
    SEEDDECK_DESKTOP_PREVIEW_ROOT: path.resolve(__dirname, ".."),
  };
  delete env.ELECTRON_RUN_AS_NODE;

  const child = spawnSync(electronPath, [tempApp], {
    stdio: "inherit",
    env,
  });

  try {
    fs.rmSync(tempApp, { recursive: true, force: true });
  } catch {}
  process.exit(child.status ?? 1);
}

if (!electron.app || !electron.BrowserWindow) {
  relaunchAsElectronApp(electron);
}

const { app, BrowserWindow } = electron;

const ROOT = process.env.SEEDDECK_DESKTOP_PREVIEW_ROOT
  ? path.resolve(process.env.SEEDDECK_DESKTOP_PREVIEW_ROOT)
  : path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "preview");
const RENDERER_INDEX = path.join(ROOT, "dist-desktop", "renderer", "index.html");
const PRELOAD = path.join(os.tmpdir(), `seeddeck-desktop-preview-${process.pid}.cjs`);

const preloadSource = String.raw`
const { contextBridge } = require("electron");

const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;
const now = Date.now();
const downloadDir = "D:\\Downloads\\SeedDeck";
const listeners = new Set();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function magnet(id, name) {
  return "magnet:?xt=urn:btih:" + id + "&dn=" + encodeURIComponent(name);
}

function source(id, label, homepage, status, count, error = null, custom = false) {
  return { id, label, homepage, loading: false, error, count, status, custom: custom || undefined };
}

function result(id, name, sizeBytes, seeders, leechers, sourceId, sourceLabel, group, ageMs, numFiles) {
  return {
    id,
    name,
    sizeBytes,
    seeders,
    leechers,
    source: sourceId,
    sourceLabel,
    group,
    magnet: magnet(id, name),
    added: Math.floor((now - ageMs) / 1000),
    numFiles,
  };
}

const ids = {
  ubuntu: "1111111111111111111111111111111111111111",
  blender: "2222222222222222222222222222222222222222",
  libreoffice: "3333333333333333333333333333333333333333",
  fedora: "4444444444444444444444444444444444444444",
  bunny: "5555555555555555555555555555555555555555",
  veloren: "6666666666666666666666666666666666666666",
  debian: "7777777777777777777777777777777777777777",
  mint: "8888888888888888888888888888888888888888",
  krita: "9999999999999999999999999999999999999999",
  sintel: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
};

const searchResults = [
  result(ids.ubuntu, "Ubuntu 26.04 Desktop ISO", 5.37 * GB, 420, 88, "solid", "Solid", "TV", 1000 * 60 * 12, 4),
  result(ids.blender, "Blender Open Movie Collection", 2.61 * GB, 246, 41, "yts", "YTS", "Movies", 1000 * 60 * 24, 9),
  result(ids.libreoffice, "LibreOffice Offline Installer", 321 * MB, 138, 24, "tpb-tv", "TPB", "TV", 1000 * 60 * 55, 1),
  result(ids.fedora, "Fedora Workstation 40 Live ISO", 2.23 * GB, 96, 17, "solid", "Solid", "TV", 1000 * 60 * 120, 3),
  result(ids.bunny, "Big Buck Bunny 1080p Open Movie", 734 * MB, 84, 18, "yts", "YTS", "Movies", 1000 * 60 * 240, 5),
  result(ids.veloren, "Veloren Open Source RPG Build", 986 * MB, 55, 11, "fitgirl", "FitGirl", "Games", 1000 * 60 * 300, 18),
  result(ids.sintel, "Sintel 2010 Open Movie 4K", 1.82 * GB, 44, 9, "x1337-movies", "1337x", "Movies", 1000 * 60 * 480, 6),
  result(ids.debian, "Debian Netinst ISO", 752 * MB, 37, 6, "solid", "Solid", "TV", 1000 * 60 * 720, 2),
];

let snapshot = {
  config: {
    downloadDir,
    language: "zh",
    theme: "dark",
    customSources: [
      {
        id: "open-index",
        label: "OpenIndex",
        url: "https://example.com/rss?q={query}",
        enabled: true,
      },
    ],
  },
  downloads: [
    {
      id: ids.ubuntu,
      name: "Ubuntu 26.04 Desktop ISO",
      source: "solid",
      magnet: magnet(ids.ubuntu, "Ubuntu 26.04 Desktop ISO"),
      dir: downloadDir,
      status: "downloading",
      progress: 72,
      totalBytes: 5.37 * GB,
      downloadedBytes: 3.86 * GB,
      speed: 12.4 * MB,
      peers: 126,
      eta: 138,
      files: 4,
      addedAt: now - 1000 * 60 * 8,
    },
    {
      id: ids.blender,
      name: "Blender Open Movie Collection",
      source: "yts",
      magnet: magnet(ids.blender, "Blender Open Movie Collection"),
      dir: downloadDir,
      status: "downloading",
      progress: 43,
      totalBytes: 2.61 * GB,
      downloadedBytes: 1.12 * GB,
      speed: 8.7 * MB,
      peers: 74,
      eta: 67,
      files: 9,
      addedAt: now - 1000 * 60 * 18,
    },
    {
      id: ids.libreoffice,
      name: "LibreOffice Offline Installer",
      source: "tpb-tv",
      magnet: magnet(ids.libreoffice, "LibreOffice Offline Installer"),
      dir: downloadDir,
      status: "downloading",
      progress: 18,
      totalBytes: 321 * MB,
      downloadedBytes: 58 * MB,
      speed: 3.1 * MB,
      peers: 42,
      eta: 35,
      files: 1,
      addedAt: now - 1000 * 60 * 27,
    },
    {
      id: ids.krita,
      name: "Krita 5.2.5 Setup",
      source: "solid",
      magnet: magnet(ids.krita, "Krita 5.2.5 Setup"),
      dir: downloadDir,
      status: "paused",
      progress: 52,
      totalBytes: 198 * MB,
      downloadedBytes: 103 * MB,
      speed: 0,
      peers: 18,
      eta: undefined,
      files: 1,
      addedAt: now - 1000 * 60 * 44,
    },
  ],
  history: [
    {
      id: ids.fedora,
      name: "Fedora Workstation 40 Live ISO",
      source: "solid",
      sizeBytes: 2.23 * GB,
      magnet: magnet(ids.fedora, "Fedora Workstation 40 Live ISO"),
      dir: downloadDir,
      completedAt: now - 1000 * 60 * 32,
    },
    {
      id: ids.bunny,
      name: "Big Buck Bunny 1080p Open Movie",
      source: "yts",
      sizeBytes: 734 * MB,
      magnet: magnet(ids.bunny, "Big Buck Bunny 1080p Open Movie"),
      dir: downloadDir,
      completedAt: now - 1000 * 60 * 95,
    },
    {
      id: ids.debian,
      name: "Debian Netinst ISO",
      source: "solid",
      sizeBytes: 752 * MB,
      magnet: magnet(ids.debian, "Debian Netinst ISO"),
      dir: downloadDir,
      completedAt: now - 1000 * 60 * 190,
    },
  ],
  seeds: [
    {
      id: ids.fedora,
      name: "Fedora Workstation 40 Live ISO",
      source: "solid",
      magnet: magnet(ids.fedora, "Fedora Workstation 40 Live ISO"),
      dir: downloadDir,
      sizeBytes: 2.23 * GB,
      status: "seeding",
      uploadSpeed: 1.6 * MB,
      uploaded: 1.04 * GB,
      peers: 31,
    },
    {
      id: ids.bunny,
      name: "Big Buck Bunny 1080p Open Movie",
      source: "yts",
      magnet: magnet(ids.bunny, "Big Buck Bunny 1080p Open Movie"),
      dir: downloadDir,
      sizeBytes: 734 * MB,
      status: "seeding",
      uploadSpeed: 820 * KB,
      uploaded: 2.7 * GB,
      peers: 18,
    },
    {
      id: ids.debian,
      name: "Debian Netinst ISO",
      source: "solid",
      magnet: magnet(ids.debian, "Debian Netinst ISO"),
      dir: downloadDir,
      sizeBytes: 752 * MB,
      status: "paused",
      uploadSpeed: 0,
      uploaded: 486 * MB,
      peers: 0,
    },
  ],
  sources: [
    source("fitgirl", "FitGirl", "https://fitgirl-repacks.site", "online", 8),
    source("yts", "YTS", "https://yts.mx", "online", 56),
    source("tpb-movies", "TPB Movies", "https://apibay.org", "online", 64),
    source("x1337-movies", "1337x Movies", "https://1337x.to", "offline", 0, "HTTP 403"),
    source("eztv", "EZTV", "https://eztv.re", "online", 42),
    source("solid", "Solid", "https://solidtorrents.net", "online", 100),
    source("tpb-tv", "TPB TV", "https://apibay.org", "online", 51),
    source("x1337-tv", "1337x TV", "https://1337x.to", "offline", 0, "HTTP 403"),
    source("nyaa", "Nyaa", "https://nyaa.si", "online", 29),
    source("subsplease", "SubsPlease", "https://subsplease.org", "online", 12),
    source("custom:open-index", "OpenIndex", "https://example.com", "online", 17, null, true),
  ],
};

function notify() {
  const next = clone(snapshot);
  for (const listener of listeners) listener(next);
}

function withSnapshot(update) {
  update();
  notify();
  return clone(snapshot);
}

contextBridge.exposeInMainWorld("seeddeck", {
  getSnapshot: async () => clone(snapshot),
  search: async (query) => ({
    query,
    results: clone(searchResults),
    sources: clone(snapshot.sources),
    startedAt: now - 420,
    completedAt: now,
  }),
  addDownload: async (input) => withSnapshot(() => {
    if (snapshot.downloads.some((item) => item.id === input.id)) return;
    snapshot.downloads.unshift({
      id: input.id,
      name: input.name,
      source: input.source,
      magnet: input.magnet,
      dir: snapshot.config.downloadDir,
      status: "downloading",
      progress: 1,
      totalBytes: input.sizeBytes || 0,
      downloadedBytes: 0,
      speed: 0,
      peers: 0,
      addedAt: Date.now(),
    });
  }),
  addMagnet: async () => clone(snapshot),
  addTorrentFile: async () => clone(snapshot),
  addTorrentPath: async () => clone(snapshot),
  pauseDownload: async (id) => withSnapshot(() => {
    const item = snapshot.downloads.find((download) => download.id === id);
    if (item) item.status = "paused";
  }),
  resumeDownload: async (id) => withSnapshot(() => {
    const item = snapshot.downloads.find((download) => download.id === id);
    if (item) item.status = "downloading";
  }),
  removeDownload: async (id) => withSnapshot(() => {
    snapshot.downloads = snapshot.downloads.filter((download) => download.id !== id);
  }),
  retryDownload: async (id) => withSnapshot(() => {
    const item = snapshot.downloads.find((download) => download.id === id);
    if (item) item.status = "downloading";
  }),
  toggleSeeding: async (id) => withSnapshot(() => {
    const item = snapshot.seeds.find((seed) => seed.id === id);
    if (item) item.status = item.status === "seeding" ? "paused" : "seeding";
  }),
  removeHistory: async (id) => withSnapshot(() => {
    snapshot.history = snapshot.history.filter((item) => item.id !== id);
    snapshot.seeds = snapshot.seeds.filter((item) => item.id !== id);
  }),
  clearHistory: async () => withSnapshot(() => {
    snapshot.history = [];
    snapshot.seeds = [];
  }),
  chooseDownloadDir: async () => clone(snapshot),
  setDownloadDir: async (raw) => withSnapshot(() => {
    snapshot.config.downloadDir = raw;
  }),
  setLanguage: async (language) => withSnapshot(() => {
    snapshot.config.language = language;
  }),
  setTheme: async (theme) => withSnapshot(() => {
    snapshot.config.theme = theme;
  }),
  checkSources: async () => clone(snapshot),
  addCustomSource: async (input) => withSnapshot(() => {
    const id = input.label.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "custom-source";
    snapshot.config.customSources.push({ id, label: input.label, url: input.url, enabled: true });
  }),
  removeCustomSource: async (id) => withSnapshot(() => {
    snapshot.config.customSources = snapshot.config.customSources.filter((source) => source.id !== id);
  }),
  toggleCustomSource: async (id) => withSnapshot(() => {
    const item = snapshot.config.customSources.find((source) => source.id === id);
    if (item) item.enabled = !item.enabled;
  }),
  readClipboard: async () => magnet(ids.ubuntu, "Ubuntu 26.04 Desktop ISO"),
  openPath: async () => undefined,
  revealPath: async () => undefined,
  minimizeWindow: async () => undefined,
  toggleMaximizeWindow: async () => undefined,
  closeWindow: async () => undefined,
  onSnapshot: (callback) => {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },
  onNotice: () => () => undefined,
  onCommand: () => () => undefined,
});
`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(webContents, expression, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ready = await webContents.executeJavaScript(`Boolean(${expression})`);
    if (ready) return;
    await sleep(80);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

async function setInputAndSearch(webContents, query) {
  await webContents.executeJavaScript(`
    (() => {
      const input = document.querySelector(".hero-search input");
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(input, ${JSON.stringify(query)});
      input.dispatchEvent(new Event("input", { bubbles: true }));
      document.querySelector(".hero-search button[type='submit']").click();
    })();
  `);
  await waitFor(webContents, "document.querySelectorAll('.result-row').length >= 4");
}

async function openNav(webContents, index, selector) {
  await webContents.executeJavaScript(`
    (() => {
      const button = document.querySelectorAll(".side-nav button")[${index}];
      button.click();
    })();
  `);
  await waitFor(webContents, `document.querySelector("${selector}")`);
  await sleep(220);
}

async function capture(webContents, name) {
  await webContents.executeJavaScript("document.fonts ? document.fonts.ready.then(() => true) : true");
  await webContents.executeJavaScript(
    "new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
  );
  await webContents.capturePage();
  await sleep(240);
  await webContents.executeJavaScript(
    "new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
  );
  const image = await webContents.capturePage();
  const file = path.join(OUT_DIR, name);
  fs.writeFileSync(file, image.toPNG());
  console.log(`preview/${name}`);
}

async function main() {
  if (!fs.existsSync(RENDERER_INDEX)) {
    throw new Error("Missing dist-desktop/renderer/index.html. Run the desktop renderer build first.");
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(PRELOAD, preloadSource, "utf8");

  await app.whenReady();
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    show: false,
    paintWhenInitiallyHidden: true,
    backgroundColor: "#030405",
    title: "SeedDeck Preview",
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  await win.loadFile(RENDERER_INDEX);
  await waitFor(win.webContents, "document.querySelector('.desktop-shell')");
  await sleep(350);

  await setInputAndSearch(win.webContents, "ubuntu desktop iso");
  await sleep(500);
  await capture(win.webContents, "desktop-home.png");

  await openNav(win.webContents, 1, ".downloads-table");
  await capture(win.webContents, "desktop-downloads.png");

  await openNav(win.webContents, 2, ".seeds-table");
  await capture(win.webContents, "desktop-sharing.png");

  await openNav(win.webContents, 3, ".history-table");
  await capture(win.webContents, "desktop-history.png");

  await openNav(win.webContents, 4, ".settings-card");
  await capture(win.webContents, "desktop-settings.png");

  win.close();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    try {
      fs.rmSync(PRELOAD, { force: true });
    } catch {}
    app.quit();
  });

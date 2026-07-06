import type {
  BrowserWindow as BrowserWindowType,
  MenuItemConstructorOptions,
  MessageBoxOptions,
} from "electron";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CHANNELS,
  type AddDownloadInput,
  type DesktopCommand,
  type DesktopLanguage,
  type DesktopNotice,
  type DesktopSnapshot,
  type DesktopTheme,
} from "../shared/api";
import { selectedDialogPath } from "./dialogs";
import { DesktopService } from "./service";

const require = createRequire(import.meta.url);
const electron = require("electron") as typeof import("electron");
const { app, BrowserWindow, Menu, clipboard, dialog, ipcMain, shell } = electron;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ID = "dev.seeddeck.desktop";
const APP_NAME = "SeedDeck";
const service = new DesktopService();
const pendingLaunchInputs = new Set<string>();
let mainWindow: BrowserWindowType | null = null;
let quitting = false;

function showWindow(window: BrowserWindowType): void {
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}

function resolveIconPath(): string | undefined {
  const packagedIcon = path.join(process.resourcesPath, "icon.png");
  if (existsSync(packagedIcon)) return packagedIcon;

  const workspaceIcon = path.resolve(__dirname, "../../build/icon.png");
  if (existsSync(workspaceIcon)) return workspaceIcon;

  return undefined;
}

function sendSnapshot(snapshot: DesktopSnapshot): void {
  mainWindow?.webContents.send(CHANNELS.snapshotUpdated, snapshot);
}

function sendNotice(notice: DesktopNotice): void {
  mainWindow?.webContents.send(CHANNELS.notice, notice);
}

function sendCommand(command: DesktopCommand): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    void ensureWindow().then((window) => {
      showWindow(window);
      window.webContents.send(CHANNELS.command, command);
    });
    return;
  }

  showWindow(mainWindow);
  mainWindow.webContents.send(CHANNELS.command, command);
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function reportError(error: unknown): void {
  sendNotice({ tone: "danger", message: messageFromError(error) });
}

function normalizeLaunchInput(raw: string): string {
  const trimmed = raw.trim().replace(/^"|"$/g, "");
  if (/^file:\/\//i.test(trimmed)) {
    try {
      return fileURLToPath(trimmed);
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

function isLaunchInput(raw: string): boolean {
  const input = normalizeLaunchInput(raw);
  return /^magnet:\?/i.test(input) || /\.torrent$/i.test(input);
}

function queueLaunchArguments(argv: string[]): boolean {
  let queued = false;
  for (const arg of argv) {
    if (!isLaunchInput(arg)) continue;
    pendingLaunchInputs.add(normalizeLaunchInput(arg));
    queued = true;
  }
  return queued;
}

async function handleLaunchInput(raw: string): Promise<void> {
  const input = normalizeLaunchInput(raw);
  if (/^magnet:\?/i.test(input)) {
    const snapshot = await service.addMagnet(input);
    sendSnapshot(snapshot);
    sendCommand("show-downloads");
    return;
  }

  if (/\.torrent$/i.test(input)) {
    const snapshot = await service.addTorrentFile(input);
    sendSnapshot(snapshot);
    sendCommand("show-downloads");
  }
}

async function flushPendingLaunchInputs(): Promise<void> {
  if (!app.isReady() || pendingLaunchInputs.size === 0) return;
  await service.init();
  const inputs = [...pendingLaunchInputs];
  pendingLaunchInputs.clear();
  for (const input of inputs) {
    try {
      await handleLaunchInput(input);
    } catch (error) {
      reportError(error);
    }
  }
}

async function openTorrentFromDialog(): Promise<DesktopSnapshot | null> {
  const window = await ensureWindow();
  const result = await dialog.showOpenDialog(window, {
    title: "Open torrent",
    properties: ["openFile"],
    filters: [{ name: "Torrent files", extensions: ["torrent"] }],
  });
  const filePath = selectedDialogPath(result);
  if (!filePath) return null;
  const snapshot = await service.addTorrentFile(filePath);
  sendSnapshot(snapshot);
  sendCommand("show-downloads");
  return snapshot;
}

async function addTorrentPath(filePath: string): Promise<DesktopSnapshot> {
  const snapshot = await service.addTorrentFile(filePath);
  sendSnapshot(snapshot);
  sendCommand("show-downloads");
  return snapshot;
}

async function chooseDownloadDirectory(): Promise<DesktopSnapshot | null> {
  const window = await ensureWindow();
  const result = await dialog.showOpenDialog(window, {
    title: "Choose download folder",
    properties: ["openDirectory", "createDirectory"],
  });
  const filePath = selectedDialogPath(result);
  if (!filePath) return null;
  const snapshot = await service.setDownloadDir(filePath);
  sendSnapshot(snapshot);
  return snapshot;
}

function registerProtocol(): void {
  if (process.defaultApp && process.argv.length >= 2 && process.argv[1]) {
    app.setAsDefaultProtocolClient("magnet", process.execPath, [path.resolve(process.argv[1])]);
    return;
  }
  app.setAsDefaultProtocolClient("magnet");
}

function buildMenu(): void {
  const isMac = process.platform === "darwin";
  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: APP_NAME,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          } satisfies MenuItemConstructorOptions,
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "New Search",
          accelerator: "CommandOrControl+N",
          click: () => sendCommand("focus-search"),
        },
        {
          label: "Paste Magnet Link",
          accelerator: "CommandOrControl+Shift+V",
          click: () => sendCommand("paste-link"),
        },
        {
          label: "Open Torrent...",
          accelerator: "CommandOrControl+O",
          click: () => void openTorrentFromDialog().catch(reportError),
        },
        { type: "separator" },
        {
          label: "Change Download Folder...",
          accelerator: "CommandOrControl+,",
          click: () => void chooseDownloadDirectory().catch(reportError),
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Navigate",
      submenu: [
        {
          label: "Downloads",
          accelerator: "CommandOrControl+D",
          click: () => sendCommand("show-downloads"),
        },
        {
          label: "Settings",
          click: () => sendCommand("show-settings"),
        },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About SeedDeck",
          click: () => {
            const parent = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
            const options: MessageBoxOptions = {
              type: "info",
              title: "About SeedDeck",
              message: "SeedDeck",
              detail: "A desktop torrent search, magnet import, download, and seeding workspace.",
              buttons: ["OK"],
            };
            void (parent ? dialog.showMessageBox(parent, options) : dialog.showMessageBox(options));
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function registerIpc(): void {
  ipcMain.handle(CHANNELS.snapshot, async () => {
    await service.init();
    return service.snapshot();
  });
  ipcMain.handle(CHANNELS.search, async (_event, query: string) => service.search(query));
  ipcMain.handle(CHANNELS.addDownload, async (_event, input: AddDownloadInput) =>
    service.addDownload(input),
  );
  ipcMain.handle(CHANNELS.addMagnet, async (_event, raw: string) => service.addMagnet(raw));
  ipcMain.handle(CHANNELS.addTorrentFile, async () => openTorrentFromDialog());
  ipcMain.handle(CHANNELS.addTorrentPath, async (_event, filePath: string) => addTorrentPath(filePath));
  ipcMain.handle(CHANNELS.pauseDownload, async (_event, id: string) => service.pauseDownload(id));
  ipcMain.handle(CHANNELS.resumeDownload, async (_event, id: string) => service.resumeDownload(id));
  ipcMain.handle(CHANNELS.removeDownload, async (_event, id: string) => service.removeDownload(id));
  ipcMain.handle(CHANNELS.retryDownload, async (_event, id: string) => service.retryDownload(id));
  ipcMain.handle(CHANNELS.toggleSeeding, async (_event, id: string) => service.toggleSeeding(id));
  ipcMain.handle(CHANNELS.removeHistory, async (_event, id: string) => service.removeHistory(id));
  ipcMain.handle(CHANNELS.clearHistory, async () => service.clearHistory());
  ipcMain.handle(CHANNELS.chooseDownloadDir, async () => chooseDownloadDirectory());
  ipcMain.handle(CHANNELS.setDownloadDir, async (_event, raw: string) => service.setDownloadDir(raw));
  ipcMain.handle(CHANNELS.setLanguage, async (_event, language: DesktopLanguage) =>
    service.setLanguage(language),
  );
  ipcMain.handle(CHANNELS.setTheme, async (_event, theme: DesktopTheme) => service.setTheme(theme));
  ipcMain.handle(CHANNELS.checkSources, async () => service.checkSources());
  ipcMain.handle(CHANNELS.addCustomSource, async (_event, input: { label: string; url: string }) =>
    service.addCustomSource(input),
  );
  ipcMain.handle(CHANNELS.removeCustomSource, async (_event, id: string) => service.removeCustomSource(id));
  ipcMain.handle(CHANNELS.toggleCustomSource, async (_event, id: string) => service.toggleCustomSource(id));
  ipcMain.handle(CHANNELS.readClipboard, () => clipboard.readText());
  ipcMain.handle(CHANNELS.openPath, async (_event, target: string) => {
    await shell.openPath(target);
  });
  ipcMain.handle(CHANNELS.revealPath, (_event, target: string) => {
    shell.showItemInFolder(target);
  });
  ipcMain.handle(CHANNELS.windowMinimize, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });
  ipcMain.handle(CHANNELS.windowToggleMaximize, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return;
    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  });
  ipcMain.handle(CHANNELS.windowClose, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });
}

async function createWindow(): Promise<BrowserWindowType> {
  await service.init();
  const window = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1040,
    minHeight: 720,
    backgroundColor: "#08060d",
    frame: false,
    autoHideMenuBar: true,
    title: "SeedDeck",
    icon: resolveIconPath(),
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow = window;

  window.on("closed", () => {
    if (mainWindow === window) {
      mainWindow = null;
    }
  });

  window.on("close", () => {
    if (!quitting) service.suspend();
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    const currentUrl = window.webContents.getURL();
    if (url !== currentUrl && /^https?:\/\//i.test(url)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  window.webContents.on("did-finish-load", () => {
    sendSnapshot(service.snapshot());
    void flushPendingLaunchInputs();
  });

  window.webContents.on("render-process-gone", (_event, details) => {
    sendNotice({ tone: "danger", message: `Renderer stopped: ${details.reason}` });
  });

  window.on("unresponsive", () => {
    sendNotice({ tone: "warning", message: "SeedDeck is busy. Downloads will keep their saved state." });
  });

  window.on("responsive", () => {
    sendNotice({ tone: "info", message: "SeedDeck is responsive again." });
  });

  const devUrl = (process.env.SEEDDECK_DESKTOP_DEV_SERVER_URL ?? process.env.TORLINK_DESKTOP_DEV_SERVER_URL);
  if (devUrl) {
    await window.loadURL(devUrl);
    window.webContents.openDevTools({ mode: "detach" });
  } else {
    await window.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  sendSnapshot(service.snapshot());
  return window;
}

async function ensureWindow(): Promise<BrowserWindowType> {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
  return createWindow();
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.setName(APP_NAME);
  app.setAppUserModelId(APP_ID);
  queueLaunchArguments(process.argv);

  registerIpc();
  service.on("snapshot", (snapshot: DesktopSnapshot) => sendSnapshot(snapshot));
  service.on("notice", (notice: DesktopNotice) => sendNotice(notice));

  app.on("second-instance", (_event, argv) => {
    const hasLaunchInput = queueLaunchArguments(argv);
    void ensureWindow().then((window) => {
      showWindow(window);
      if (!hasLaunchInput) sendCommand("focus-search");
      return flushPendingLaunchInputs();
    });
  });

  app.on("open-file", (event, filePath) => {
    event.preventDefault();
    if (isLaunchInput(filePath)) pendingLaunchInputs.add(normalizeLaunchInput(filePath));
    void flushPendingLaunchInputs();
  });

  app.whenReady().then(() => {
    registerProtocol();
    buildMenu();
    void createWindow();
    app.on("activate", () => {
      void ensureWindow().then(showWindow);
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  app.on("before-quit", () => {
    quitting = true;
    service.suspend();
  });
}

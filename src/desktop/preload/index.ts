import { contextBridge, ipcRenderer } from "electron";
import {
  CHANNELS,
  type AddDownloadInput,
  type DesktopCommand,
  type DesktopNotice,
  type DesktopSnapshot,
  type SeedDeckDesktopApi,
} from "../shared/api";

function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  return ipcRenderer.invoke(channel, ...args) as Promise<T>;
}

const api: SeedDeckDesktopApi = {
  getSnapshot: () => invoke(CHANNELS.snapshot),
  search: (query) => invoke(CHANNELS.search, query),
  addDownload: (input: AddDownloadInput) => invoke(CHANNELS.addDownload, input),
  addMagnet: (raw) => invoke(CHANNELS.addMagnet, raw),
  addTorrentFile: () => invoke(CHANNELS.addTorrentFile),
  addTorrentPath: (path) => invoke(CHANNELS.addTorrentPath, path),
  pauseDownload: (id) => invoke(CHANNELS.pauseDownload, id),
  resumeDownload: (id) => invoke(CHANNELS.resumeDownload, id),
  removeDownload: (id) => invoke(CHANNELS.removeDownload, id),
  retryDownload: (id) => invoke(CHANNELS.retryDownload, id),
  toggleSeeding: (historyId) => invoke(CHANNELS.toggleSeeding, historyId),
  removeHistory: (id) => invoke(CHANNELS.removeHistory, id),
  clearHistory: () => invoke(CHANNELS.clearHistory),
  chooseDownloadDir: () => invoke(CHANNELS.chooseDownloadDir),
  setDownloadDir: (raw) => invoke(CHANNELS.setDownloadDir, raw),
  setLanguage: (language) => invoke(CHANNELS.setLanguage, language),
  setTheme: (theme) => invoke(CHANNELS.setTheme, theme),
  checkSources: () => invoke(CHANNELS.checkSources),
  addCustomSource: (input) => invoke(CHANNELS.addCustomSource, input),
  removeCustomSource: (id) => invoke(CHANNELS.removeCustomSource, id),
  toggleCustomSource: (id) => invoke(CHANNELS.toggleCustomSource, id),
  readClipboard: () => invoke(CHANNELS.readClipboard),
  openPath: (path) => invoke(CHANNELS.openPath, path),
  revealPath: (path) => invoke(CHANNELS.revealPath, path),
  minimizeWindow: () => invoke(CHANNELS.windowMinimize),
  toggleMaximizeWindow: () => invoke(CHANNELS.windowToggleMaximize),
  closeWindow: () => invoke(CHANNELS.windowClose),
  onSnapshot: (callback: (snapshot: DesktopSnapshot) => void) => {
    const listener = (_: Electron.IpcRendererEvent, snapshot: DesktopSnapshot) => callback(snapshot);
    ipcRenderer.on(CHANNELS.snapshotUpdated, listener);
    return () => ipcRenderer.off(CHANNELS.snapshotUpdated, listener);
  },
  onNotice: (callback: (notice: DesktopNotice) => void) => {
    const listener = (_: Electron.IpcRendererEvent, notice: DesktopNotice) => callback(notice);
    ipcRenderer.on(CHANNELS.notice, listener);
    return () => ipcRenderer.off(CHANNELS.notice, listener);
  },
  onCommand: (callback: (command: DesktopCommand) => void) => {
    const listener = (_: Electron.IpcRendererEvent, command: DesktopCommand) => callback(command);
    ipcRenderer.on(CHANNELS.command, listener);
    return () => ipcRenderer.off(CHANNELS.command, listener);
  },
};

contextBridge.exposeInMainWorld("seeddeck", api);

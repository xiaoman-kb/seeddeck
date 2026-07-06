import type {
  AddDownloadInput,
  DesktopCommand,
  CustomSourceInput,
  DesktopNotice,
  DesktopSearchResponse,
  DesktopSnapshot,
  SeedDeckDesktopApi,
} from "../../shared/api";

const unavailableMessage = "SeedDeck desktop bridge is not available.";

const emptySnapshot: DesktopSnapshot = {
  config: { downloadDir: "", customSources: [], language: "en", theme: "dark" },
  downloads: [],
  history: [],
  seeds: [],
  sources: [],
};

function unavailable(): never {
  throw new Error(unavailableMessage);
}

const unavailableApi: SeedDeckDesktopApi = {
  async getSnapshot() {
    return emptySnapshot;
  },
  async search(): Promise<DesktopSearchResponse> {
    unavailable();
  },
  async addDownload(_input: AddDownloadInput) {
    unavailable();
  },
  async addMagnet() {
    unavailable();
  },
  async addTorrentFile() {
    unavailable();
  },
  async addTorrentPath() {
    unavailable();
  },
  async pauseDownload() {
    unavailable();
  },
  async resumeDownload() {
    unavailable();
  },
  async removeDownload() {
    unavailable();
  },
  async retryDownload() {
    unavailable();
  },
  async toggleSeeding() {
    unavailable();
  },
  async removeHistory() {
    unavailable();
  },
  async clearHistory() {
    unavailable();
  },
  async chooseDownloadDir() {
    unavailable();
  },
  async setDownloadDir() {
    unavailable();
  },
  async setLanguage() {
    unavailable();
  },
  async setTheme() {
    unavailable();
  },
  async checkSources() {
    unavailable();
  },
  async addCustomSource(_input: CustomSourceInput) {
    unavailable();
  },
  async removeCustomSource() {
    unavailable();
  },
  async toggleCustomSource() {
    unavailable();
  },
  async readClipboard() {
    unavailable();
  },
  async openPath() {
    unavailable();
  },
  async revealPath() {
    unavailable();
  },
  async minimizeWindow() {
    unavailable();
  },
  async toggleMaximizeWindow() {
    unavailable();
  },
  async closeWindow() {
    unavailable();
  },
  onSnapshot() {
    return () => {};
  },
  onNotice(_callback: (notice: DesktopNotice) => void) {
    return () => {};
  },
  onCommand(_callback: (command: DesktopCommand) => void) {
    return () => {};
  },
};

export const hasDesktopBridge = Boolean(window.seeddeck);
export const seeddeckApi: SeedDeckDesktopApi = window.seeddeck ?? unavailableApi;
export const desktopBridgeUnavailableMessage = unavailableMessage;

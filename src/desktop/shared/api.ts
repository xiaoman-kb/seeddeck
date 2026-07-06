export const CHANNELS = {
  snapshot: "seeddeck:snapshot",
  search: "seeddeck:search",
  addDownload: "seeddeck:download:add",
  addMagnet: "seeddeck:download:add-magnet",
  addTorrentFile: "seeddeck:download:add-torrent-file",
  addTorrentPath: "seeddeck:download:add-torrent-path",
  pauseDownload: "seeddeck:download:pause",
  resumeDownload: "seeddeck:download:resume",
  removeDownload: "seeddeck:download:remove",
  retryDownload: "seeddeck:download:retry",
  toggleSeeding: "seeddeck:seed:toggle",
  removeHistory: "seeddeck:history:remove",
  clearHistory: "seeddeck:history:clear",
  chooseDownloadDir: "seeddeck:settings:choose-download-dir",
  setDownloadDir: "seeddeck:settings:set-download-dir",
  setLanguage: "seeddeck:settings:set-language",
  setTheme: "seeddeck:settings:set-theme",
  checkSources: "seeddeck:sources:check",
  addCustomSource: "seeddeck:sources:add-custom",
  removeCustomSource: "seeddeck:sources:remove-custom",
  toggleCustomSource: "seeddeck:sources:toggle-custom",
  readClipboard: "seeddeck:clipboard:read",
  openPath: "seeddeck:shell:open-path",
  revealPath: "seeddeck:shell:reveal-path",
  windowMinimize: "seeddeck:window:minimize",
  windowToggleMaximize: "seeddeck:window:toggle-maximize",
  windowClose: "seeddeck:window:close",
  snapshotUpdated: "seeddeck:snapshot-updated",
  notice: "seeddeck:notice",
  command: "seeddeck:command",
} as const;

export type DesktopCommand =
  | "focus-search"
  | "paste-link"
  | "open-torrent"
  | "show-downloads"
  | "show-settings";

export type SourceId =
  | "fitgirl"
  | "yts"
  | "eztv"
  | "nyaa"
  | "subsplease"
  | "solid"
  | "tpb-movies"
  | "tpb-tv"
  | "x1337-movies"
  | "x1337-tv"
  | `custom:${string}`
  | "public";

export type DesktopSourceGroup = "Games" | "Movies" | "TV" | "Anime" | "Custom";
export type DesktopLanguage = "en" | "zh";
export type DesktopTheme = "dark" | "light";

export interface DesktopCustomSource {
  id: string;
  label: string;
  url: string;
  enabled: boolean;
}

export interface DesktopConfig {
  downloadDir: string;
  customSources: DesktopCustomSource[];
  language: DesktopLanguage;
  theme: DesktopTheme;
}

export interface DesktopSearchResult {
  id: string;
  name: string;
  sizeBytes: number;
  seeders: number;
  leechers: number;
  source: SourceId;
  sourceLabel: string;
  group: DesktopSourceGroup;
  magnet: string;
  added?: number;
  numFiles?: number;
}

export interface DesktopDownload {
  id: string;
  name: string;
  source?: SourceId;
  magnet: string;
  dir: string;
  status: "downloading" | "paused" | "completed" | "failed";
  progress: number;
  totalBytes: number;
  downloadedBytes: number;
  speed: number;
  peers: number;
  eta?: number;
  files?: number;
  error?: string;
  addedAt: number;
}

export interface DesktopHistoryItem {
  id: string;
  name: string;
  source?: SourceId;
  sizeBytes: number;
  magnet: string;
  dir: string;
  completedAt: number;
}

export interface DesktopSeed {
  id: string;
  name: string;
  source?: SourceId;
  magnet: string;
  dir: string;
  sizeBytes: number;
  status: "seeding" | "paused" | "missing";
  uploadSpeed: number;
  uploaded: number;
  peers: number;
}

export interface DesktopSnapshot {
  config: DesktopConfig;
  downloads: DesktopDownload[];
  history: DesktopHistoryItem[];
  seeds: DesktopSeed[];
  sources: SourceSearchState[];
}

export interface SourceSearchState {
  id: SourceId;
  label: string;
  homepage: string;
  loading: boolean;
  error: string | null;
  count: number;
  status: "checking" | "online" | "offline" | "idle";
  custom?: boolean;
}

export interface DesktopSearchResponse {
  query: string;
  results: DesktopSearchResult[];
  sources: SourceSearchState[];
  startedAt: number;
  completedAt: number;
}

export interface DesktopNotice {
  tone: "info" | "success" | "warning" | "danger";
  message: string;
}

export interface AddDownloadInput {
  id: string;
  name: string;
  magnet: string;
  source?: SourceId;
  sizeBytes?: number;
}

export interface CustomSourceInput {
  label: string;
  url: string;
}

export interface SeedDeckDesktopApi {
  getSnapshot(): Promise<DesktopSnapshot>;
  search(query: string): Promise<DesktopSearchResponse>;
  addDownload(input: AddDownloadInput): Promise<DesktopSnapshot>;
  addMagnet(raw: string): Promise<DesktopSnapshot>;
  addTorrentFile(): Promise<DesktopSnapshot | null>;
  addTorrentPath(path: string): Promise<DesktopSnapshot>;
  pauseDownload(id: string): Promise<DesktopSnapshot>;
  resumeDownload(id: string): Promise<DesktopSnapshot>;
  removeDownload(id: string): Promise<DesktopSnapshot>;
  retryDownload(id: string): Promise<DesktopSnapshot>;
  toggleSeeding(historyId: string): Promise<DesktopSnapshot>;
  removeHistory(id: string): Promise<DesktopSnapshot>;
  clearHistory(): Promise<DesktopSnapshot>;
  chooseDownloadDir(): Promise<DesktopSnapshot | null>;
  setDownloadDir(raw: string): Promise<DesktopSnapshot>;
  setLanguage(language: DesktopLanguage): Promise<DesktopSnapshot>;
  setTheme(theme: DesktopTheme): Promise<DesktopSnapshot>;
  checkSources(): Promise<DesktopSnapshot>;
  addCustomSource(input: CustomSourceInput): Promise<DesktopSnapshot>;
  removeCustomSource(id: string): Promise<DesktopSnapshot>;
  toggleCustomSource(id: string): Promise<DesktopSnapshot>;
  readClipboard(): Promise<string>;
  openPath(path: string): Promise<void>;
  revealPath(path: string): Promise<void>;
  minimizeWindow(): Promise<void>;
  toggleMaximizeWindow(): Promise<void>;
  closeWindow(): Promise<void>;
  onSnapshot(callback: (snapshot: DesktopSnapshot) => void): () => void;
  onNotice(callback: (notice: DesktopNotice) => void): () => void;
  onCommand(callback: (command: DesktopCommand) => void): () => void;
}

declare global {
  interface Window {
    seeddeck?: SeedDeckDesktopApi;
  }
}

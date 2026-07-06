import { EventEmitter } from "node:events";
import { promises as fs } from "node:fs";
import { DownloadQueue } from "../../download/queue";
import { loadQueue, loadSeeds } from "../../download/persist";
import { loadHistory } from "../../download/history";
import { reconcileQueue } from "../../download/reconcile";
import { loadConfig, saveConfig, type Config, defaultConfig } from "../../config/config";
import { normalizeDownloadDir } from "../../config/folder";
import { buildCustomSources } from "../../sources/custom";
import { parseMagnet } from "../../sources/magnet";
import { magnetFromTorrentFile } from "../../sources/torrentFile";
import { SOURCES } from "../../sources/registry";
import { cachedSearch } from "../../sources/cache";
import { HttpError } from "../../util/net";
import type { QueueItem, SeedItem } from "../../download/types";
import type { HistoryItem } from "../../download/history";
import type { Source, SourceId as CoreSourceId, TorrentResult } from "../../sources/types";
import type {
  AddDownloadInput,
  DesktopConfig,
  DesktopDownload,
  DesktopHistoryItem,
  DesktopLanguage,
  DesktopSearchResponse,
  DesktopSearchResult,
  DesktopSeed,
  DesktopSnapshot,
  DesktopTheme,
  CustomSourceInput,
  SourceId,
  SourceSearchState,
} from "../shared/api";

const SEARCH_TIMEOUT_MS = 25000;
const SOURCE_CHECK_TIMEOUT_MS = 12000;

function sourceForQueue(source?: SourceId): CoreSourceId | undefined {
  return source && source !== "public" ? (source as CoreSourceId) : undefined;
}

function desktopSource(source?: CoreSourceId): SourceId | undefined {
  return source;
}

function toDownload(item: QueueItem): DesktopDownload {
  return {
    id: item.id,
    name: item.name,
    source: desktopSource(item.source),
    magnet: item.magnet,
    dir: item.dir,
    status: item.status,
    progress: item.progress,
    totalBytes: item.totalBytes,
    downloadedBytes: item.downloadedBytes,
    speed: item.speed,
    peers: item.peers,
    eta: item.eta,
    files: item.files,
    error: item.error,
    addedAt: item.addedAt,
  };
}

function toHistory(item: HistoryItem): DesktopHistoryItem {
  return {
    id: item.id,
    name: item.name,
    source: desktopSource(item.source),
    sizeBytes: item.sizeBytes,
    magnet: item.magnet,
    dir: item.dir,
    completedAt: item.completedAt,
  };
}

function toSeed(item: SeedItem): DesktopSeed {
  return {
    id: item.id,
    name: item.name,
    source: desktopSource(item.source),
    magnet: item.magnet,
    dir: item.dir,
    sizeBytes: item.sizeBytes,
    status: item.status,
    uploadSpeed: item.uploadSpeed,
    uploaded: item.uploaded,
    peers: item.peers,
  };
}

function toConfig(config: Config): DesktopConfig {
  return {
    downloadDir: config.downloadDir,
    customSources: config.customSources.map((source) => ({ ...source })),
    language: config.language,
    theme: config.theme,
  };
}

function toSearchResult(result: TorrentResult, source: Source): DesktopSearchResult {
  return {
    id: result.infoHash,
    name: result.name,
    sizeBytes: result.sizeBytes,
    seeders: result.seeders,
    leechers: result.leechers,
    source: result.source,
    sourceLabel: source.label,
    group: source.group,
    magnet: result.magnet,
    added: result.added,
    numFiles: result.numFiles,
  };
}

function dedupe(results: DesktopSearchResult[]): DesktopSearchResult[] {
  const byHash = new Map<string, DesktopSearchResult>();
  for (const result of results) {
    const existing = byHash.get(result.id);
    if (!existing || result.seeders > existing.seeders) byHash.set(result.id, result);
  }
  return [...byHash.values()].sort((a, b) => {
    if (b.seeders !== a.seeders) return b.seeders - a.seeders;
    return (b.added ?? 0) - (a.added ?? 0);
  });
}

function errorMessage(error: unknown, timedOut: boolean): string {
  if (timedOut) return "timed out";
  if (error instanceof HttpError && error.status > 0) return `HTTP ${error.status}`;
  return error instanceof Error ? error.message : String(error);
}

function isCustomSource(source: Source): boolean {
  return source.id.startsWith("custom:");
}

function sourceState(
  source: Source,
  overrides: Partial<SourceSearchState> = {},
): SourceSearchState {
  return {
    id: source.id as SourceId,
    label: source.label,
    homepage: source.homepage,
    loading: false,
    error: null,
    count: 0,
    status: "idle",
    custom: isCustomSource(source) || undefined,
    ...overrides,
  };
}

function sourceSort(a: SourceSearchState, b: SourceSearchState): number {
  if (a.custom !== b.custom) return a.custom ? 1 : -1;
  return a.label.localeCompare(b.label);
}

function slugifySourceLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function validateCustomSource(input: CustomSourceInput): { label: string; url: string } {
  const label = input.label.trim();
  const url = input.url.trim();
  if (!label) throw new Error("Source name cannot be blank.");
  if (label.length > 32) throw new Error("Source name must be 32 characters or fewer.");
  if (!url.includes("{query}")) throw new Error("RSS URL must include {query} where the search term should go.");
  let parsed: URL;
  try {
    parsed = new URL(url.replaceAll("{query}", "test"));
  } catch {
    throw new Error("Enter a valid RSS search URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Custom sources must use http or https.");
  }
  return { label, url };
}

export class DesktopService extends EventEmitter {
  private config: Config = { ...defaultConfig };
  private queue = new DownloadQueue();
  private initialized: Promise<void> | null = null;
  private sourceStates: SourceSearchState[] = [];
  private sourceCheck: Promise<void> | null = null;
  private sourceCheckRun = 0;

  init(): Promise<void> {
    if (this.initialized) return this.initialized;
    this.initialized = this.boot();
    return this.initialized;
  }

  private async boot(): Promise<void> {
    this.config = await loadConfig();
    this.sourceStates = this.allSources().map((source) =>
      sourceState(source, { loading: true, status: "checking" }),
    );
    this.queue.restore(reconcileQueue(await loadQueue()));
    this.queue.restoreHistory(await loadHistory());
    this.queue.restoreSeeds(await loadSeeds());
    this.queue.on("update", () => this.emitSnapshot());
    this.startSourceCheck();
  }

  snapshot(): DesktopSnapshot {
    return {
      config: toConfig(this.config),
      downloads: this.queue.getItems().map(toDownload),
      history: this.queue.getHistory().map(toHistory),
      seeds: this.queue.getSeeds().map(toSeed),
      sources: this.sourceStates,
    };
  }

  async search(query: string): Promise<DesktopSearchResponse> {
    await this.init();
    const q = query.trim();
    const startedAt = Date.now();
    const sources: SourceSearchState[] = [];
    const results: DesktopSearchResult[] = [];

    await Promise.all(
      this.allSources().map(async (source) => {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), SEARCH_TIMEOUT_MS);
        try {
          const res = await cachedSearch(source, q, { signal: ctrl.signal });
          results.push(...res.map((item) => toSearchResult(item, source)));
          sources.push(sourceState(source, { status: "online", count: res.length }));
        } catch (error) {
          sources.push(sourceState(source, {
            status: "offline",
            error: errorMessage(error, ctrl.signal.aborted),
          }));
        } finally {
          clearTimeout(timer);
        }
      }),
    );
    this.sourceStates = sources.sort(sourceSort);
    this.emitSnapshot();

    return {
      query: q,
      results: dedupe(results),
      sources: this.sourceStates,
      startedAt,
      completedAt: Date.now(),
    };
  }

  async addDownload(input: AddDownloadInput): Promise<DesktopSnapshot> {
    await this.init();
    await fs.mkdir(this.config.downloadDir, { recursive: true }).catch(() => {});
    this.queue.add(
      {
        id: input.id,
        name: input.name,
        magnet: input.magnet,
        source: sourceForQueue(input.source),
        sizeBytes: input.sizeBytes,
      },
      this.config.downloadDir,
    );
    this.emitNotice("success", `Added ${input.name}`);
    return this.snapshot();
  }

  async addMagnet(raw: string): Promise<DesktopSnapshot> {
    await this.init();
    const parsed = parseMagnet(raw);
    if (!parsed) throw new Error("No valid magnet link found.");
    return this.addDownload({
      id: parsed.infoHash,
      name: parsed.name,
      magnet: parsed.magnet,
    });
  }

  async addTorrentFile(filePath: string): Promise<DesktopSnapshot> {
    await this.init();
    const parsed = await magnetFromTorrentFile(filePath);
    if (!parsed) throw new Error("Could not read that .torrent file.");
    return this.addDownload({
      id: parsed.infoHash,
      name: parsed.name,
      magnet: parsed.magnet,
    });
  }

  async pauseDownload(id: string): Promise<DesktopSnapshot> {
    await this.init();
    this.queue.pause(id);
    return this.snapshot();
  }

  async resumeDownload(id: string): Promise<DesktopSnapshot> {
    await this.init();
    this.queue.resume(id);
    return this.snapshot();
  }

  async removeDownload(id: string): Promise<DesktopSnapshot> {
    await this.init();
    this.queue.cancel(id);
    return this.snapshot();
  }

  async retryDownload(id: string): Promise<DesktopSnapshot> {
    await this.init();
    this.queue.retry(id);
    return this.snapshot();
  }

  async toggleSeeding(historyId: string): Promise<DesktopSnapshot> {
    await this.init();
    const item = this.queue.getHistory().find((h) => h.id === historyId);
    if (!item) throw new Error("Download history item not found.");
    this.queue.toggleSeeding(item);
    return this.snapshot();
  }

  async removeHistory(id: string): Promise<DesktopSnapshot> {
    await this.init();
    this.queue.removeHistory(id);
    return this.snapshot();
  }

  async clearHistory(): Promise<DesktopSnapshot> {
    await this.init();
    this.queue.clearHistory();
    return this.snapshot();
  }

  async setDownloadDir(raw: string): Promise<DesktopSnapshot> {
    await this.init();
    const downloadDir = normalizeDownloadDir(raw);
    if (!downloadDir) throw new Error("Download folder cannot be blank.");
    await fs.mkdir(downloadDir, { recursive: true });
    this.config = { ...this.config, downloadDir };
    await saveConfig(this.config);
    this.emitNotice("success", `Download folder changed.`);
    this.emitSnapshot();
    return this.snapshot();
  }

  async setLanguage(language: DesktopLanguage): Promise<DesktopSnapshot> {
    await this.init();
    if (language !== "en" && language !== "zh") throw new Error("Unsupported language.");
    this.config = { ...this.config, language };
    await saveConfig(this.config);
    this.emitSnapshot();
    return this.snapshot();
  }

  async setTheme(theme: DesktopTheme): Promise<DesktopSnapshot> {
    await this.init();
    if (theme !== "dark" && theme !== "light") throw new Error("Unsupported theme.");
    this.config = { ...this.config, theme };
    await saveConfig(this.config);
    this.emitSnapshot();
    return this.snapshot();
  }

  async checkSources(): Promise<DesktopSnapshot> {
    await this.init();
    await this.runSourceCheck();
    return this.snapshot();
  }

  async addCustomSource(input: CustomSourceInput): Promise<DesktopSnapshot> {
    await this.init();
    const source = validateCustomSource(input);
    const existingIds = new Set(this.config.customSources.map((item) => item.id));
    const base = slugifySourceLabel(source.label) || "custom-source";
    let id = base;
    let suffix = 2;
    while (existingIds.has(id)) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }
    this.config = {
      ...this.config,
      customSources: [...this.config.customSources, { id, ...source, enabled: true }],
    };
    await saveConfig(this.config);
    this.sourceStates = this.allSources().map((item) =>
      sourceState(item, { loading: true, status: "checking" }),
    );
    this.emitNotice("success", `Added source ${source.label}.`);
    this.emitSnapshot();
    this.startSourceCheck();
    return this.snapshot();
  }

  async removeCustomSource(id: string): Promise<DesktopSnapshot> {
    await this.init();
    const next = this.config.customSources.filter((source) => source.id !== id);
    if (next.length === this.config.customSources.length) throw new Error("Custom source not found.");
    this.config = { ...this.config, customSources: next };
    await saveConfig(this.config);
    this.sourceStates = this.allSources().map((source) => sourceState(source));
    this.emitNotice("success", "Source removed.");
    this.emitSnapshot();
    this.startSourceCheck();
    return this.snapshot();
  }

  async toggleCustomSource(id: string): Promise<DesktopSnapshot> {
    await this.init();
    let found = false;
    this.config = {
      ...this.config,
      customSources: this.config.customSources.map((source) => {
        if (source.id !== id) return source;
        found = true;
        return { ...source, enabled: !source.enabled };
      }),
    };
    if (!found) throw new Error("Custom source not found.");
    await saveConfig(this.config);
    this.sourceStates = this.allSources().map((source) =>
      sourceState(source, { loading: true, status: "checking" }),
    );
    this.emitSnapshot();
    this.startSourceCheck();
    return this.snapshot();
  }

  suspend(): void {
    this.queue.persistSync();
    this.queue.suspend();
  }

  private allSources(): Source[] {
    return [...SOURCES, ...buildCustomSources(this.config.customSources)];
  }

  private startSourceCheck(): void {
    void this.runSourceCheck().catch((error) => {
      this.emitNotice("warning", error instanceof Error ? error.message : String(error));
    });
  }

  private runSourceCheck(): Promise<void> {
    const run = ++this.sourceCheckRun;
    this.sourceCheck = this.performSourceCheck(run).finally(() => {
      if (this.sourceCheckRun === run) this.sourceCheck = null;
    });
    return this.sourceCheck;
  }

  private async performSourceCheck(run: number): Promise<void> {
    const sources = this.allSources();
    this.sourceStates = sources
      .map((source) => sourceState(source, { loading: true, status: "checking" }))
      .sort(sourceSort);
    this.emitSnapshot();

    const states = await Promise.all(
      sources.map(async (source) => {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), SOURCE_CHECK_TIMEOUT_MS);
        try {
          const results = await cachedSearch(source, "", { signal: ctrl.signal });
          return sourceState(source, { status: "online", count: results.length });
        } catch (error) {
          return sourceState(source, {
            status: "offline",
            error: errorMessage(error, ctrl.signal.aborted),
          });
        } finally {
          clearTimeout(timer);
        }
      }),
    );

    if (this.sourceCheckRun !== run) return;
    this.sourceStates = states.sort(sourceSort);
    this.emitSnapshot();
  }

  private emitSnapshot(): void {
    this.emit("snapshot", this.snapshot());
  }

  private emitNotice(tone: "info" | "success" | "warning" | "danger", message: string): void {
    this.emit("notice", { tone, message });
  }
}

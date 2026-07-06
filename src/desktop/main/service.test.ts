import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Source, SourceId, TorrentResult } from "../../sources/types";

const PUBLIC_HASH = "0123456789abcdef0123456789abcdef01234567";
const CUSTOM_HASH = "89abcdef0123456789abcdef0123456789abcdef";
const HISTORY_HASH = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const mocks = vi.hoisted(() => ({
  cachedSearch: vi.fn(),
  engineAdds: [] as Array<{ id: string; source: string; dir: string }>,
  engineRemoves: [] as string[],
}));

vi.mock("../../download/engine", () => ({
  TorrentEngine: class FakeTorrentEngine {
    add(id: string, source: string, dir: string): void {
      mocks.engineAdds.push({ id, source: String(source), dir });
    }

    remove(id: string): void {
      mocks.engineRemoves.push(id);
    }

    stats(): null {
      return null;
    }

    destroy(): void {}
  },
}));

vi.mock("../../sources/registry", () => ({
  SOURCES: [
    {
      id: "solid",
      label: "Solid",
      group: "Games",
      homepage: "https://solid.example.test",
      search: vi.fn(),
    } satisfies Source,
  ],
}));

vi.mock("../../sources/cache", () => ({
  cachedSearch: mocks.cachedSearch,
}));

const tempDirs: string[] = [];

function magnet(infoHash: string, name: string): string {
  return `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(name)}`;
}

function resultFor(source: Source, query: string): TorrentResult[] {
  const custom = source.id.startsWith("custom:");
  const infoHash = custom ? CUSTOM_HASH : PUBLIC_HASH;
  const name = query.trim() ? `${query.trim()} from ${source.label}` : `${source.label} latest`;
  return [{
    infoHash,
    name,
    sizeBytes: custom ? 2048 : 1024,
    seeders: custom ? 3 : 9,
    leechers: 1,
    source: source.id,
    magnet: magnet(infoHash, name),
    added: 1700000000,
    numFiles: 1,
  }];
}

async function makeStateDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "seeddeck-service-"));
  tempDirs.push(dir);
  return dir;
}

async function createService(stateDir?: string) {
  const dir = stateDir ?? await makeStateDir();
  process.env.SEEDDECK_STATE_DIR = dir;
  vi.resetModules();
  const mod = await import("./service");
  return { service: new mod.DesktopService(), stateDir: dir };
}

type BValue = string | number | Uint8Array | { [key: string]: BValue };

function bencode(value: BValue): Buffer {
  if (typeof value === "number") return Buffer.from(`i${value}e`);
  if (typeof value === "string") {
    const data = Buffer.from(value);
    return Buffer.concat([Buffer.from(`${data.length}:`), data]);
  }
  if (value instanceof Uint8Array) {
    const data = Buffer.from(value);
    return Buffer.concat([Buffer.from(`${data.length}:`), data]);
  }
  const chunks: Buffer[] = [Buffer.from("d")];
  for (const key of Object.keys(value).sort()) {
    chunks.push(bencode(key), bencode(value[key]!));
  }
  chunks.push(Buffer.from("e"));
  return Buffer.concat(chunks);
}

async function writeTorrentFixture(dir: string): Promise<string> {
  const content = Buffer.from("SeedDeck fixture file\n");
  const torrent = bencode({
    announce: "udp://tracker.invalid:80/announce",
    info: {
      length: content.length,
      name: "seeddeck-fixture.txt",
      "piece length": 16384,
      pieces: createHash("sha1").update(content).digest(),
    },
  });
  const torrentPath = path.join(dir, "seeddeck-fixture.torrent");
  await fs.writeFile(torrentPath, torrent);
  return torrentPath;
}

async function seedHistory(stateDir: string): Promise<void> {
  const dataDir = path.join(stateDir, "data");
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(path.join(dataDir, "history.json"), JSON.stringify([
    {
      id: HISTORY_HASH,
      name: "Completed Fixture",
      source: "solid" satisfies SourceId,
      sizeBytes: 4096,
      magnet: magnet(HISTORY_HASH, "Completed Fixture"),
      dir: path.join(stateDir, "downloads"),
      completedAt: 1700000000000,
    },
  ]), "utf8");
}

beforeEach(() => {
  mocks.cachedSearch.mockReset();
  mocks.cachedSearch.mockImplementation((source: Source, query: string) => Promise.resolve(resultFor(source, query)));
  mocks.engineAdds.length = 0;
  mocks.engineRemoves.length = 0;
});

afterEach(async () => {
  delete process.env.SEEDDECK_STATE_DIR;
  vi.resetModules();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })));
});

describe("DesktopService release acceptance", () => {
  it("checks sources on startup, searches, and manages custom sources", async () => {
    const { service } = await createService();
    await service.init();

    expect(service.snapshot().sources).toEqual([
      expect.objectContaining({ id: "solid", status: "checking", loading: true }),
    ]);

    let snapshot = await service.checkSources();
    expect(snapshot.sources).toEqual([
      expect.objectContaining({ id: "solid", status: "online", count: 1 }),
    ]);

    const search = await service.search("ubuntu");
    expect(search.query).toBe("ubuntu");
    expect(search.results).toEqual([
      expect.objectContaining({ id: PUBLIC_HASH, name: "ubuntu from Solid", source: "solid" }),
    ]);

    snapshot = await service.addCustomSource({
      label: "Local RSS",
      url: "https://example.test/rss?q={query}",
    });
    expect(snapshot.config.customSources).toEqual([
      expect.objectContaining({ id: "local-rss", label: "Local RSS", enabled: true }),
    ]);

    snapshot = await service.checkSources();
    expect(snapshot.sources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "solid", status: "online" }),
      expect.objectContaining({ id: "custom:local-rss", status: "online", custom: true }),
    ]));

    snapshot = await service.toggleCustomSource("local-rss");
    expect(snapshot.config.customSources[0]?.enabled).toBe(false);

    snapshot = await service.removeCustomSource("local-rss");
    expect(snapshot.config.customSources).toEqual([]);
    service.suspend();
  });

  it("imports magnet links and torrent files, then pauses, resumes, and removes downloads", async () => {
    const { service, stateDir } = await createService();
    const downloadDir = path.join(stateDir, "downloads");
    await service.setDownloadDir(downloadDir);

    let snapshot = await service.addMagnet(magnet(PUBLIC_HASH, "Magnet Fixture"));
    expect(snapshot.downloads).toEqual([
      expect.objectContaining({ id: PUBLIC_HASH, name: "Magnet Fixture", status: "downloading", dir: downloadDir }),
    ]);
    expect(mocks.engineAdds).toContainEqual(expect.objectContaining({ id: PUBLIC_HASH, dir: downloadDir }));

    snapshot = await service.pauseDownload(PUBLIC_HASH);
    expect(snapshot.downloads[0]?.status).toBe("paused");
    expect(mocks.engineRemoves).toContain(PUBLIC_HASH);

    snapshot = await service.resumeDownload(PUBLIC_HASH);
    expect(snapshot.downloads[0]?.status).toBe("downloading");

    const torrentPath = await writeTorrentFixture(stateDir);
    snapshot = await service.addTorrentFile(torrentPath);
    expect(snapshot.downloads).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "seeddeck-fixture.txt", status: "downloading" }),
    ]));

    snapshot = await service.removeDownload(PUBLIC_HASH);
    expect(snapshot.downloads.find((item) => item.id === PUBLIC_HASH)).toBeUndefined();
    service.suspend();
  });

  it("loads history and toggles sharing without an active download", async () => {
    const stateDir = await makeStateDir();
    await seedHistory(stateDir);
    const { service } = await createService(stateDir);
    await service.init();

    expect(service.snapshot().history).toEqual([
      expect.objectContaining({ id: HISTORY_HASH, name: "Completed Fixture" }),
    ]);

    let snapshot = await service.toggleSeeding(HISTORY_HASH);
    expect(snapshot.seeds).toEqual([
      expect.objectContaining({ id: HISTORY_HASH, status: "seeding" }),
    ]);

    snapshot = await service.toggleSeeding(HISTORY_HASH);
    expect(snapshot.seeds).toEqual([
      expect.objectContaining({ id: HISTORY_HASH, status: "paused" }),
    ]);

    snapshot = await service.removeHistory(HISTORY_HASH);
    expect(snapshot.history).toEqual([]);
    expect(snapshot.seeds).toEqual([]);
    service.suspend();
  });

  it("persists settings across service restarts", async () => {
    const { service, stateDir } = await createService();
    const downloadDir = path.join(stateDir, "chosen-downloads");

    await service.setDownloadDir(downloadDir);
    await service.setLanguage("zh");
    await service.setTheme("light");
    service.suspend();

    const { service: restarted } = await createService(stateDir);
    await restarted.init();
    expect(restarted.snapshot().config).toEqual(expect.objectContaining({
      downloadDir,
      language: "zh",
      theme: "light",
    }));
    restarted.suspend();
  });
});

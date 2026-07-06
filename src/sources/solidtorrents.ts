import { fetchResilient, HttpError, USER_AGENT } from "../util/net";
import { buildMagnet } from "./magnet";
import type { SearchOptions, Source, TorrentResult } from "./types";

interface SolidResult {
  infohash?: string;
  title?: string;
  size?: number;
  seeders?: number;
  leechers?: number;
  updatedAt?: string;
}

interface SolidResponse {
  success?: boolean;
  results?: SolidResult[];
}

async function search(query: string, opts: SearchOptions = {}): Promise<TorrentResult[]> {
  const q = query.trim() || "tv show";
  const params = new URLSearchParams({ q });
  const url = `https://solidtorrents.net/api/v1/search?${params.toString()}`;

  const res = await fetchResilient(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: opts.signal,
    retries: 1,
  });

  if (!res.ok) throw new HttpError(res.status, `SolidTorrents returned ${res.status}`);
  const json = (await res.json()) as SolidResponse;

  const out: TorrentResult[] = [];
  for (const item of json.results ?? []) {
    if (!item.infohash) continue;
    const infoHash = item.infohash.toLowerCase();
    const name = item.title || "Unknown";
    const added = item.updatedAt ? Math.floor(new Date(item.updatedAt).getTime() / 1000) : undefined;

    out.push({
      infoHash,
      name,
      sizeBytes: item.size ?? 0,
      seeders: item.seeders ?? 0,
      leechers: item.leechers ?? 0,
      source: "solid",
      magnet: buildMagnet(infoHash, name),
      added,
    });
  }
  return out;
}

export const solid: Source = {
  id: "solid",
  label: "Solid",
  group: "TV",
  homepage: "https://solidtorrents.net",
  search,
};

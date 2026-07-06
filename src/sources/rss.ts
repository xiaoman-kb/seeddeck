import { fetchResilient, HttpError, USER_AGENT } from "../util/net";
import type { SearchOptions, SourceId, TorrentResult } from "./types";

export function unescapeEntities(s: string): string {
  return s
    .replace(/&#0?38;|&amp;/g, "&")
    .replace(/&#8211;|&#8212;/g, "-")
    .replace(/&#8217;|&#0?39;|&apos;/g, "'")
    .replace(/&#8220;|&#8221;|&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function parseRssItems(xml: string, source: SourceId): TorrentResult[] {
  const items = xml.split("<item>").slice(1);
  const out: TorrentResult[] = [];
  for (const item of items) {
    const magnetMatch =
      item.match(/href="(magnet:\?xt=urn:btih:[^"]+)"/i) ??
      item.match(/<(?:link|guid)>\s*(magnet:\?xt=urn:btih:[^<]+)<\/(?:link|guid)>/i);
    if (!magnetMatch) continue;
    const magnet = unescapeEntities(magnetMatch[1]!);
    const infoHash = magnet.match(/urn:btih:([a-zA-Z0-9]+)/)?.[1]?.toLowerCase() ?? "";
    if (!infoHash) continue;

    const name = unescapeEntities(item.match(/<title>(.*?)<\/title>/)?.[1] ?? "Unknown Title");
    const addedStr = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "";
    const added = addedStr ? new Date(addedStr).getTime() / 1000 : 0;

    out.push({ infoHash, name, sizeBytes: 0, seeders: 0, leechers: 0, source, magnet, added });
  }
  return out;
}

export async function fetchRssUrl(
  url: string,
  source: SourceId,
  opts: SearchOptions = {},
): Promise<TorrentResult[]> {
  const res = await fetchResilient(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: opts.signal,
    retries: 1,
  });
  if (!res.ok) throw new HttpError(res.status, `${source} feed returned ${res.status}`);

  return parseRssItems(await res.text(), source);
}

export async function fetchWordpressRss(
  base: string,
  source: SourceId,
  query: string,
  opts: SearchOptions = {},
): Promise<TorrentResult[]> {
  const q = query.trim();
  const url = q
    ? `${base}/?s=${encodeURIComponent(q)}&feed=rss2`
    : `${base}/feed/`;

  const res = await fetchResilient(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: opts.signal,
  });
  if (!res.ok) throw new HttpError(res.status, `${source} feed returned ${res.status}`);

  return parseRssItems(await res.text(), source);
}

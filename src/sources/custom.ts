import type { CustomSourceConfig } from "../config/config";
import { fetchRssUrl } from "./rss";
import type { Source, SourceId } from "./types";

export function customSourceId(id: string): SourceId {
  return `custom:${id}`;
}

export function buildCustomSources(configs: readonly CustomSourceConfig[]): Source[] {
  return configs
    .filter((config) => config.enabled)
    .map((config) => {
      const id = customSourceId(config.id);
      return {
        id,
        label: config.label,
        group: "Custom",
        homepage: config.url,
        search: (query, opts = {}) => {
          const url = config.url.replaceAll("{query}", encodeURIComponent(query.trim()));
          return fetchRssUrl(url, id, opts);
        },
      };
    });
}

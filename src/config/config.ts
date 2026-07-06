import { promises as fs } from "node:fs";
import { configFile, defaultDownloadDir } from "./paths";
import { serializeWrites, writeJsonAtomic } from "../util/atomic";

export interface CustomSourceConfig {
  id: string;
  label: string;
  url: string;
  enabled: boolean;
}

export type AppLanguage = "en" | "zh";
export type AppTheme = "dark" | "light";

export interface Config {
  downloadDir: string;
  customSources: CustomSourceConfig[];
  language: AppLanguage;
  theme: AppTheme;
}

export const defaultConfig: Config = {
  downloadDir: defaultDownloadDir,
  customSources: [],
  language: "en",
  theme: "dark",
};

function sanitizeLanguage(value: unknown): AppLanguage {
  return value === "zh" || value === "en" ? value : defaultConfig.language;
}

function sanitizeTheme(value: unknown): AppTheme {
  return value === "light" || value === "dark" ? value : defaultConfig.theme;
}

function sanitizeCustomSources(value: unknown): CustomSourceConfig[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: CustomSourceConfig[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const source = item as Partial<CustomSourceConfig>;
    const id = typeof source.id === "string" ? source.id.trim().toLowerCase() : "";
    const label = typeof source.label === "string" ? source.label.trim() : "";
    const url = typeof source.url === "string" ? source.url.trim() : "";
    if (!id || !label || !url || seen.has(id)) continue;
    if (!/^https?:\/\//i.test(url) || !url.includes("{query}")) continue;
    seen.add(id);
    out.push({ id, label, url, enabled: source.enabled !== false });
  }
  return out;
}

export async function loadConfig(): Promise<Config> {
  let raw: string;
  try {
    raw = await fs.readFile(configFile, "utf8");
  } catch {
    return { ...defaultConfig };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<Config>;
    const cfg = { ...defaultConfig, ...parsed };
    if (!cfg.downloadDir || typeof cfg.downloadDir !== "string") {
      cfg.downloadDir = defaultDownloadDir;
    }
    cfg.customSources = sanitizeCustomSources(parsed.customSources);
    cfg.language = sanitizeLanguage(parsed.language);
    cfg.theme = sanitizeTheme(parsed.theme);
    return cfg;
  } catch {
    return { ...defaultConfig };
  }
}

const write = serializeWrites();

export function saveConfig(config: Config): Promise<void> {
  return write(() => writeJsonAtomic(configFile, config));
}

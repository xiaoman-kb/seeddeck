import { createContext, useContext, useEffect, useMemo, useRef, useState, type DragEvent, type Ref } from "react";
import {
  Bell,
  CheckCircle2,
  Download,
  FileDown,
  Folder,
  FolderOpen,
  Gauge,
  HardDriveDownload,
  History,
  Home,
  Link,
  LoaderCircle,
  Maximize2,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Trash2,
  Upload,
  Wifi,
  X,
} from "lucide-react";
import { formatBytes, formatBytesPerSec, formatEtaShort, formatRelative } from "../../../util/format";
import type {
  DesktopDownload,
  DesktopHistoryItem,
  DesktopLanguage,
  DesktopNotice,
  DesktopSearchResult,
  DesktopSeed,
  DesktopSnapshot,
  DesktopTheme,
  SourceId,
  SourceSearchState,
} from "../../shared/api";
import { desktopBridgeUnavailableMessage, hasDesktopBridge, seeddeckApi } from "./api";

type Section = "home" | "downloads" | "sharing" | "history" | "settings";
type ResultFilter = "all" | "games" | "movies" | "tv" | "anime";
type DetailsTab = "overview" | "files" | "peers" | "source";
type ResultActionState = "queued" | "downloaded" | "seeding";

const FILTERS: { key: ResultFilter; labelKey: TranslationKey }[] = [
  { key: "all", labelKey: "all" },
  { key: "games", labelKey: "games" },
  { key: "movies", labelKey: "movies" },
  { key: "tv", labelKey: "tv" },
  { key: "anime", labelKey: "anime" },
];

const EN = {
  addSource: "Add source",
  added: "Added",
  alreadyDownloaded: "Already downloaded",
  alreadyQueued: "Already in downloads",
  all: "All",
  anime: "Anime",
  appearance: "Appearance",
  appStarting: "Starting SeedDeck desktop...",
  avgProgress: "Avg progress",
  available: "Available",
  bridgeUnavailable: "Bridge unavailable",
  cancelImport: "Cancel import",
  changeFolder: "Change folder",
  checkSources: "Check sources",
  chinese: "中文",
  choose: "Choose",
  chooseFolder: "Choose folder",
  clear: "Clear",
  clearHistoryConfirm: "Clear download history?",
  close: "Close",
  clipboardEmpty: "Clipboard is empty.",
  completed: "Completed",
  connected: "Connected",
  currentSession: "Current session",
  customRssHelp: "Add RSS search URLs that return magnet links. Use {query} where SeedDeck should insert the search term.",
  customRssSources: "Custom RSS sources",
  dark: "Dark",
  disabled: "Disabled",
  dismissNotice: "Dismiss notice",
  downSpeed: "Down speed",
  downloaded: "Downloaded",
  downloading: "Downloading",
  downloads: "Downloads",
  downloadsHelp: "Manage live transfers and imported torrent files.",
  downloadFolder: "Download folder",
  downloadFolderBlank: "Download folder cannot be blank.",
  dropImport: "Drop to import",
  dropTorrent: "Drop a .torrent file or magnet link.",
  droppedPathMissing: "Dropped file path was not available.",
  enabled: "Enabled",
  english: "English",
  enterSearch: "Enter a search term or paste a magnet link.",
  error: "Error",
  eta: "ETA",
  failed: "Failed",
  filterResults: "Filter results",
  fast: "Fast",
  files: "Files",
  filesReported: "{count} files reported",
  folder: "Folder",
  games: "Games",
  health: "Health",
  healthy: "Healthy",
  history: "History",
  historyHelp: "Completed downloads and sharing controls.",
  home: "Home",
  idle: "Idle",
  items: "items",
  language: "Language",
  leechers: "Leechers",
  light: "Light",
  local: "local",
  localFolderTip: "Use a local folder with enough free space.",
  magnet: "Magnet",
  maximize: "Maximize",
  metadata: "Metadata",
  metadataAfterFetch: "Available after metadata fetch",
  minimize: "Minimize",
  movies: "Movies",
  mySource: "My source",
  name: "Name",
  noActiveSeeds: "No active seeds yet. Completed downloads can be shared from history.",
  noActiveTransfer: "No active transfer",
  noCompletedDownloads: "No completed downloads yet.",
  noCustomSources: "No custom sources yet.",
  noDownloadFolder: "No download folder",
  noDownloads: "No downloads yet. Search, paste a magnet link, or open a torrent to start.",
  noItemSelected: "No item selected",
  noLiveResults: "No live results matched this filter.",
  noPeers: "No peers",
  noResultsFor: "No results for \"{query}\".",
  openFileLocation: "Open file location",
  openFolderFor: "Open folder for {name}",
  openTorrent: "Open torrent",
  overview: "overview",
  pasteLink: "Paste link",
  paused: "Paused",
  pause: "Pause",
  pauseSharing: "Pause sharing",
  peers: "Peers",
  progress: "Progress",
  primaryNav: "Primary navigation",
  quickSearch: "Quick search...",
  ready: "ready",
  remove: "Remove",
  removeCustomSourceConfirm: "Remove this custom source?",
  removeDownloadConfirm: "Remove {name} from downloads?",
  removeHistoryConfirm: "Remove {name} from history and stop sharing it?",
  removeItem: "Remove {name}",
  resume: "Resume",
  resumeSharing: "Resume sharing",
  resultFilters: "Result filters",
  resultsShown: "{shown} of {total} results",
  retry: "Retry",
  rssSearchUrl: "RSS search URL",
  runQuickSearch: "Run quick search",
  runSearchToFill: "Run a search to fill this table with live results.",
  save: "Save",
  saveLocation: "Save location",
  saveTo: "Save to",
  search: "Search",
  searchAccent: "anything.",
  searchEnd: " Download freely.",
  searchHintEmpty: "Search public sources, paste a magnet link, or open a local torrent file.",
  searchHintMagnet: "Magnet link detected. Press Enter to add it to downloads.",
  searchHintQuery: "Press Enter to search public sources.",
  searchPlaceholder: "Search or paste a magnet link",
  searchReady: "Ready",
  searchSr: "Search or paste a magnet link",
  searchStart: "Search ",
  searchSubtitle: "Search public torrent sources, paste a magnet link, or open a local torrent file.",
  searchingPublic: "Searching public sources...",
  seeders: "Seeders",
  seeding: "Seeding",
  seedingHelp: "Keep completed downloads available to peers.",
  selectToInspect: "Select a result or transfer to inspect source, files, and health before acting.",
  settings: "Settings",
  settingsHelp: "Set download storage, sources, language, and theme.",
  sharing: "Sharing",
  size: "Size",
  slow: "Slow",
  source: "Source",
  sourceName: "Name",
  sourceNameUrl: "Enter a source name and RSS search URL.",
  sourceResult: "Source result",
  sources: "Sources",
  sparse: "Sparse",
  speed: "Speed",
  speedEstimate: "Speed estimate",
  startDownload: "Start download",
  startSharing: "Start sharing {name}",
  state: "State",
  status: "Status",
  steady: "Steady",
  storage: "Storage",
  theme: "Theme",
  tip: "Tip",
  toggleSharing: "Toggle sharing",
  totalActive: "Total active",
  transferSummary: "Transfer summary",
  tv: "TV",
  unknown: "Unknown",
  upSpeed: "Up speed",
  uploaded: "Uploaded",
  windowControls: "Window controls",
} as const;

type TranslationKey = keyof typeof EN;

const ZH: Record<TranslationKey, string> = {
  addSource: "添加源",
  added: "添加时间",
  alreadyDownloaded: "已下载",
  alreadyQueued: "已在下载中",
  all: "全部",
  anime: "动画",
  appearance: "外观",
  appStarting: "正在启动 SeedDeck 桌面端...",
  avgProgress: "平均进度",
  available: "可用",
  bridgeUnavailable: "桥接不可用",
  cancelImport: "取消导入",
  changeFolder: "更改文件夹",
  checkSources: "检测源",
  chinese: "中文",
  choose: "选择",
  dark: "暗色",
  chooseFolder: "选择文件夹",
  clear: "清空",
  clearHistoryConfirm: "清空下载历史？",
  close: "关闭",
  clipboardEmpty: "剪贴板为空。",
  completed: "已完成",
  connected: "已连接",
  currentSession: "当前会话",
  customRssHelp: "添加返回磁力链接的 RSS 搜索地址。用 {query} 表示 SeedDeck 插入搜索词的位置。",
  customRssSources: "自定义 RSS 源",
  disabled: "已禁用",
  dismissNotice: "关闭通知",
  downSpeed: "下载速度",
  downloaded: "已下载",
  downloading: "下载中",
  downloads: "下载",
  downloadsHelp: "管理实时传输和导入的种子文件。",
  downloadFolder: "下载文件夹",
  downloadFolderBlank: "下载文件夹不能为空。",
  dropImport: "拖放导入",
  dropTorrent: "请拖入 .torrent 文件或磁力链接。",
  droppedPathMissing: "无法读取拖入文件路径。",
  enabled: "已启用",
  english: "English",
  enterSearch: "请输入搜索词或粘贴磁力链接。",
  error: "错误",
  eta: "剩余时间",
  failed: "失败",
  filterResults: "筛选结果",
  fast: "快",
  files: "文件",
  filesReported: "已报告 {count} 个文件",
  folder: "文件夹",
  games: "游戏",
  health: "健康度",
  healthy: "健康",
  history: "历史",
  historyHelp: "查看已完成下载和分享控制。",
  home: "首页",
  idle: "空闲",
  items: "项",
  language: "语言",
  leechers: "下载者",
  light: "亮色",
  local: "本地",
  localFolderTip: "建议使用空间充足的本地文件夹。",
  magnet: "磁力链接",
  maximize: "最大化",
  metadata: "元数据",
  metadataAfterFetch: "获取元数据后可用",
  minimize: "最小化",
  movies: "电影",
  mySource: "我的源",
  name: "名称",
  noActiveSeeds: "暂无活跃分享。已完成下载可在历史中开启分享。",
  noActiveTransfer: "无活跃传输",
  noCompletedDownloads: "暂无已完成下载。",
  noCustomSources: "暂无自定义源。",
  noDownloadFolder: "未设置下载文件夹",
  noDownloads: "暂无下载。搜索、粘贴磁力链接或打开种子即可开始。",
  noItemSelected: "未选择项目",
  noLiveResults: "没有匹配此筛选的实时结果。",
  noPeers: "无连接",
  noResultsFor: "没有找到“{query}”的结果。",
  openFileLocation: "打开文件位置",
  openFolderFor: "打开 {name} 的文件夹",
  openTorrent: "打开种子",
  overview: "概览",
  pasteLink: "粘贴链接",
  paused: "已暂停",
  pause: "暂停",
  pauseSharing: "暂停分享",
  peers: "连接",
  progress: "进度",
  primaryNav: "主导航",
  quickSearch: "快速搜索...",
  ready: "就绪",
  remove: "移除",
  removeCustomSourceConfirm: "移除此自定义源？",
  removeDownloadConfirm: "从下载列表移除 {name}？",
  removeHistoryConfirm: "从历史记录移除 {name} 并停止分享？",
  removeItem: "移除 {name}",
  resume: "继续",
  resumeSharing: "继续分享",
  resultFilters: "结果筛选",
  resultsShown: "显示 {shown} / {total} 条结果",
  retry: "重试",
  rssSearchUrl: "RSS 搜索地址",
  runQuickSearch: "执行快速搜索",
  runSearchToFill: "搜索后将在这里显示实时结果。",
  save: "保存",
  saveLocation: "保存位置",
  saveTo: "保存到",
  search: "搜索",
  searchAccent: "资源",
  searchEnd: "，轻松下载。",
  searchHintEmpty: "搜索公开来源，或粘贴磁力链接、打开本地种子文件。",
  searchHintMagnet: "检测到磁力链接，按 Enter 即可加入下载。",
  searchHintQuery: "按 Enter 搜索公开来源。",
  searchPlaceholder: "搜索或粘贴磁力链接",
  searchReady: "就绪",
  searchSr: "搜索或粘贴磁力链接",
  searchStart: "搜索",
  searchSubtitle: "搜索公开种子源，粘贴磁力链接，或打开本地种子文件。",
  searchingPublic: "正在搜索公开源...",
  seeders: "做种者",
  seeding: "分享中",
  seedingHelp: "让已完成下载继续提供给其他连接。",
  selectToInspect: "选择结果或传输项目，先检查来源、文件和健康度。",
  settings: "设置",
  settingsHelp: "设置下载存储、来源、语言和主题。",
  sharing: "分享",
  size: "大小",
  slow: "慢",
  source: "来源",
  sourceName: "名称",
  sourceNameUrl: "请输入源名称和 RSS 搜索地址。",
  sourceResult: "来源结果",
  sources: "来源",
  sparse: "稀疏",
  speed: "速度",
  speedEstimate: "速度估计",
  startDownload: "开始下载",
  startSharing: "开始分享 {name}",
  state: "状态",
  status: "状态",
  steady: "稳定",
  storage: "存储",
  theme: "主题",
  tip: "提示",
  toggleSharing: "切换分享",
  totalActive: "活跃总数",
  transferSummary: "传输摘要",
  tv: "剧集",
  unknown: "未知",
  upSpeed: "上传速度",
  uploaded: "已上传",
  windowControls: "窗口控制",
};

type Translator = (key: TranslationKey, vars?: Record<string, string | number>) => string;

function createTranslator(language: DesktopLanguage): Translator {
  const dictionary = language === "zh" ? ZH : EN;
  return (key, vars = {}) =>
    dictionary[key].replace(/\{(\w+)\}/g, (_match, name: string) => String(vars[name] ?? `{${name}}`));
}

const TranslationContext = createContext<Translator>(createTranslator("en"));

function useT(): Translator {
  return useContext(TranslationContext);
}

const SOURCE_GROUPS: {
  label: string;
  ids: SourceId[];
  tone: "green" | "yellow" | "purple" | "orange" | "teal" | "blue";
}[] = [
  { label: "YTS", ids: ["yts"], tone: "green" },
  { label: "EZTV", ids: ["eztv"], tone: "yellow" },
  { label: "NYAA", ids: ["nyaa"], tone: "purple" },
  { label: "1337x", ids: ["x1337-movies", "x1337-tv"], tone: "orange" },
  { label: "TPB", ids: ["tpb-movies", "tpb-tv"], tone: "teal" },
  { label: "Solid", ids: ["solid"], tone: "blue" },
  { label: "SubsPlease", ids: ["subsplease"], tone: "purple" },
  { label: "FitGirl", ids: ["fitgirl"], tone: "purple" },
];

const SOURCE_COLORS: Partial<Record<SourceId, string>> = {
  fitgirl: "purple",
  yts: "green",
  eztv: "yellow",
  nyaa: "purple",
  subsplease: "purple",
  solid: "blue",
  "tpb-movies": "teal",
  "tpb-tv": "teal",
  "x1337-movies": "orange",
  "x1337-tv": "orange",
  public: "green",
};

const SOURCE_FILTERS: Partial<Record<SourceId, Exclude<ResultFilter, "all">>> = {
  fitgirl: "games",
  yts: "movies",
  eztv: "tv",
  nyaa: "anime",
  subsplease: "anime",
  solid: "tv",
  "tpb-movies": "movies",
  "tpb-tv": "tv",
  "x1337-movies": "movies",
  "x1337-tv": "tv",
};

function sourceTone(source: SourceSearchState): "green" | "yellow" | "purple" | "orange" | "teal" | "blue" {
  if (source.custom) return "purple";
  return (SOURCE_COLORS[source.id] as "green" | "yellow" | "purple" | "orange" | "teal" | "blue" | undefined) ?? "purple";
}

function sourceBadge(states: SourceSearchState[]): { label: string; className: string } {
  if (states.length === 0) return { label: "-", className: "" };
  if (states.some((state) => state.loading || state.status === "checking")) return { label: "...", className: "loading" };
  const online = states.filter((state) => state.status === "online" && !state.error);
  const count = states.reduce((sum, state) => sum + state.count, 0);
  if (count > 0) return { label: String(count), className: "good" };
  if (online.length > 0) return { label: "ok", className: "good" };
  return { label: "err", className: "error" };
}

function isMagnet(input: string): boolean {
  return /^magnet:\?/i.test(input.trim());
}

function sourceClass(source?: SourceId): string {
  return source ? SOURCE_COLORS[source] ?? "purple" : "purple";
}

function knownBytes(bytes?: number, t?: Translator): string {
  return bytes && bytes > 0 ? formatBytes(bytes) : (t ? t("unknown") : EN.unknown);
}

function relativeMillis(ms?: number): string {
  return ms ? formatRelative(ms / 1000) : "";
}

function healthLabel(result: DesktopSearchResult, t?: Translator): string {
  if (result.seeders >= 50) return t ? t("healthy") : EN.healthy;
  if (result.seeders >= 10) return t ? t("available") : EN.available;
  if (result.seeders > 0) return t ? t("sparse") : EN.sparse;
  return t ? t("unknown") : EN.unknown;
}

function speedHint(result: DesktopSearchResult, t?: Translator): string {
  if (result.seeders >= 50) return t ? t("fast") : EN.fast;
  if (result.seeders >= 10) return t ? t("steady") : EN.steady;
  if (result.seeders > 0) return t ? t("slow") : EN.slow;
  return t ? t("noPeers") : EN.noPeers;
}

function resultMatchesFilter(result: DesktopSearchResult, filter: ResultFilter): boolean {
  const haystack = `${result.name} ${result.sourceLabel}`.toLowerCase();
  if (filter === "all") return true;
  const group = result.group?.toLowerCase() as ResultFilter | "custom" | undefined;
  if (group === filter) return true;
  if (SOURCE_FILTERS[result.source] === filter) return true;
  if (filter === "games") return /game|fitgirl|gog|steam|repack|pc game|xbox|playstation|ps4|ps5|switch|nintendo/.test(haystack);
  if (filter === "movies") return /movie|film|yts|bluray|bdrip|webrip|hdrip|2160p|1080p|x264|x265/.test(haystack);
  if (filter === "tv") return /tv|series|season|episode|s\d{1,2}e\d{1,2}|web-dl|hdtv|eztv/.test(haystack);
  return /anime|nyaa|subsplease|subbed|fansub|horriblesubs/.test(haystack);
}

function statusText(download: DesktopDownload, t?: Translator): string {
  const tt = t ?? createTranslator("en");
  if (download.status === "failed") return download.error ? `${tt("error")}: ${download.error}` : tt("error");
  if (download.status === "completed") return tt("completed");
  if (download.status === "paused") return tt("paused");
  const eta = formatEtaShort(download.eta);
  return eta ? `${tt("eta")} ${eta}` : tt("downloading");
}

function resultActionLabel(state: ResultActionState | undefined, t: Translator): string {
  if (state === "queued") return t("alreadyQueued");
  if (state === "downloaded") return t("alreadyDownloaded");
  if (state === "seeding") return t("seeding");
  return t("startDownload");
}

function IconButton({
  label,
  children,
  onClick,
  disabled,
  tone = "neutral",
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "neutral" | "danger";
}) {
  return (
    <button
      className={`icon-button ${tone === "danger" ? "danger" : ""}`}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function Toast({ notice, onClose }: { notice: DesktopNotice | null; onClose: () => void }) {
  const t = useT();
  if (!notice) return null;
  return (
    <div className={`toast ${notice.tone}`} role="status">
      <span>{notice.message}</span>
      <button type="button" onClick={onClose} aria-label={t("dismissNotice")}>
        <X size={14} />
      </button>
    </div>
  );
}

function PixelLogo() {
  return (
    <div className="brand-lockup" aria-label="SeedDeck">
      <span className="logo-spark" aria-hidden="true" />
      <div className="pixel-logo">SEEDDECK</div>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  const t = useT();
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="progress-track" aria-label={`${t("progress")} ${clamped}%`}>
      <div className="progress-fill" style={{ width: `${clamped}%` }} />
    </div>
  );
}

function WindowControls({
  onMinimize,
  onMaximize,
  onClose,
}: {
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <div className="window-controls" aria-label={t("windowControls")}>
      <IconButton label={t("minimize")} onClick={onMinimize}>
        <Minus size={15} />
      </IconButton>
      <IconButton label={t("maximize")} onClick={onMaximize}>
        <Maximize2 size={14} />
      </IconButton>
      <IconButton label={t("close")} tone="danger" onClick={onClose}>
        <X size={15} />
      </IconButton>
    </div>
  );
}

function Sidebar({
  section,
  setSection,
  downloads,
  activeDownloads,
  seeds,
  history,
  sourceStates,
}: {
  section: Section;
  setSection: (section: Section) => void;
  downloads: DesktopDownload[];
  activeDownloads: DesktopDownload[];
  seeds: DesktopSeed[];
  history: DesktopHistoryItem[];
  sourceStates: SourceSearchState[];
}) {
  const t = useT();
  const sourceById = new Map(sourceStates.map((source) => [source.id, source]));
  const pausedCount = downloads.filter((download) => download.status === "paused").length + seeds.filter((seed) => seed.status === "paused").length;
  const failedCount = downloads.filter((download) => download.status === "failed").length;
  const completedCount = history.length;
  const groupedIds = new Set(SOURCE_GROUPS.flatMap((group) => group.ids));
  const customSources = sourceStates.filter((source) => source.custom || !groupedIds.has(source.id));
  const navItems: { key: Section; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "home", label: t("home"), icon: <Home size={18} /> },
    { key: "downloads", label: t("downloads"), icon: <Download size={18} />, count: activeDownloads.length },
    { key: "sharing", label: t("seeding"), icon: <Upload size={18} />, count: seeds.filter((seed) => seed.status === "seeding").length },
    { key: "history", label: t("history"), icon: <History size={18} />, count: history.length },
    { key: "settings", label: t("settings"), icon: <Settings size={18} /> },
  ];

  return (
    <aside className="sidebar">
      <PixelLogo />
      <nav className="side-nav" aria-label={t("primaryNav")}>
        {navItems.map((item) => {
          const active = section === item.key;
          return (
            <button
              className={active ? "active" : ""}
              type="button"
              key={item.key}
              onClick={() => setSection(item.key)}
            >
              <span>{item.icon}</span>
              <strong>{item.label}</strong>
              {item.count ? <em>{item.count}</em> : null}
            </button>
          );
        })}
      </nav>

      <section className="sidebar-block source-block" aria-label={t("sources")}>
        <h2>{t("sources")}</h2>
        {SOURCE_GROUPS.map((group) => {
          const states = group.ids.map((id) => sourceById.get(id)).filter(Boolean) as SourceSearchState[];
          const badge = sourceBadge(states);
          return (
            <div className="source-row" key={group.label}>
              <span className={`source-dot ${group.tone}`} />
              <span>{group.label}</span>
              <em className={badge.className}>{badge.label}</em>
            </div>
          );
        })}
        {customSources.map((source) => {
          const badge = sourceBadge([source]);
          return (
            <div className="source-row" key={source.id}>
              <span className={`source-dot ${sourceTone(source)}`} />
              <span>{source.label}</span>
              <em className={badge.className}>{badge.label}</em>
            </div>
          );
        })}
      </section>

      <section className="sidebar-block status-block" aria-label={t("status")}>
        <h2>{t("status")}</h2>
        <div>
          <span>{t("all")}</span>
          <em>{downloads.length + seeds.length + history.length}</em>
        </div>
        <div>
          <span>{t("downloading")}</span>
          <em className="good">{activeDownloads.length}</em>
        </div>
        <div>
          <span>{t("seeding")}</span>
          <em className="good">{seeds.filter((seed) => seed.status === "seeding").length}</em>
        </div>
        <div>
          <span>{t("paused")}</span>
          <em className="warn">{pausedCount}</em>
        </div>
        <div>
          <span>{t("completed")}</span>
          <em className="good">{completedCount}</em>
        </div>
        <div>
          <span>{t("error")}</span>
          <em className={failedCount ? "bad" : ""}>{failedCount}</em>
        </div>
      </section>

    </aside>
  );
}

function TopBar({
  section,
  query,
  setQuery,
  searching,
  onSearch,
  setSection,
  onWindowAction,
  inputRef,
}: {
  section: Section;
  query: string;
  setQuery: (query: string) => void;
  searching: boolean;
  onSearch: () => void;
  setSection: (section: Section) => void;
  onWindowAction: (action: () => Promise<void>) => void;
  inputRef: Ref<HTMLInputElement>;
}) {
  const t = useT();
  const showQuickSearch = section !== "home";

  return (
    <header className={`topbar ${showQuickSearch ? "" : "home-topbar"}`}>
      {showQuickSearch ? (
        <form
          className="top-search"
          onSubmit={(event) => {
            event.preventDefault();
            onSearch();
          }}
        >
          <Search size={17} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder={t("quickSearch")}
            spellCheck={false}
          />
          <kbd>Ctrl K</kbd>
          <button type="submit" disabled={searching} aria-label={t("runQuickSearch")}>
            {searching ? <LoaderCircle className="spin" size={16} /> : <Search size={16} />}
          </button>
        </form>
      ) : (
        <div className="topbar-home-space" aria-hidden="true" />
      )}
      <div className="top-actions">
        <IconButton label={t("downloads")} onClick={() => setSection("downloads")}>
          <Download size={18} />
        </IconButton>
        <IconButton label={t("history")} onClick={() => setSection("history")}>
          <Bell size={18} />
        </IconButton>
        <IconButton label={t("settings")} onClick={() => setSection("settings")}>
          <Settings size={18} />
        </IconButton>
        <WindowControls
          onMinimize={() => onWindowAction(() => seeddeckApi.minimizeWindow())}
          onMaximize={() => onWindowAction(() => seeddeckApi.toggleMaximizeWindow())}
          onClose={() => onWindowAction(() => seeddeckApi.closeWindow())}
        />
      </div>
    </header>
  );
}

function SearchHero({
  query,
  setQuery,
  searching,
  onSearch,
  onPaste,
  onOpenTorrent,
  inputRef,
}: {
  query: string;
  setQuery: (query: string) => void;
  searching: boolean;
  onSearch: () => void;
  onPaste: () => void;
  onOpenTorrent: () => void;
  inputRef: Ref<HTMLInputElement>;
}) {
  const t = useT();
  const trimmedQuery = query.trim();
  const magnetReady = isMagnet(trimmedQuery);
  const hint = !trimmedQuery ? t("searchHintEmpty") : magnetReady ? t("searchHintMagnet") : t("searchHintQuery");
  return (
    <section className="hero-card">
      <div className="hero-copy">
        <h1>
          {t("searchStart")}<span>{t("searchAccent")}</span>{t("searchEnd")}
        </h1>
        <p>{t("searchSubtitle")}</p>
      </div>
      <form
        className="hero-search"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
      >
        <label>
          <Search size={21} />
          <span className="sr-only">{t("searchSr")}</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder={t("searchPlaceholder")}
            spellCheck={false}
          />
        </label>
        <button className="primary-action" type="submit" disabled={searching}>
          {searching ? <LoaderCircle className="spin" size={18} /> : <Search size={18} />}
          {t("search")}
        </button>
      </form>
      <div className={`search-helper ${magnetReady ? "good" : ""}`} aria-live="polite">
        {magnetReady ? <Link size={15} /> : <Search size={15} />}
        <span>{hint}</span>
      </div>
      <div className="hero-tools">
        <button className="ghost-action" type="button" onClick={onPaste}>
          <Link size={17} />
          {t("pasteLink")}
        </button>
        <button className="ghost-action" type="button" onClick={onOpenTorrent}>
          <FolderOpen size={17} />
          {t("openTorrent")}
        </button>
      </div>
    </section>
  );
}

function MetricCard({
  value,
  label,
  detail,
  tone = "purple",
}: {
  value: string;
  label: string;
  detail: string;
  tone?: "purple" | "green" | "neutral";
}) {
  return (
    <div className={`metric-card ${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
      <em>{detail}</em>
    </div>
  );
}

function MetricsStrip({
  activeDownloads,
  seeds,
  totalDown,
  totalUp,
  totalPeers,
}: {
  activeDownloads: DesktopDownload[];
  seeds: DesktopSeed[];
  totalDown: number;
  totalUp: number;
  totalPeers: number;
}) {
  const t = useT();
  const activeBytes = activeDownloads.reduce((sum, download) => sum + download.totalBytes, 0);
  const seedBytes = seeds.reduce((sum, seed) => sum + seed.sizeBytes, 0);
  const avgProgress =
    activeDownloads.length > 0
      ? Math.round(activeDownloads.reduce((sum, download) => sum + download.progress, 0) / activeDownloads.length)
      : 0;

  return (
    <section className="metrics-strip" aria-label={t("transferSummary")}>
      <MetricCard value={String(activeDownloads.length)} label={t("downloading")} detail={knownBytes(activeBytes, t)} />
      <MetricCard value={String(seeds.filter((seed) => seed.status === "seeding").length)} label={t("seeding")} detail={knownBytes(seedBytes, t)} tone="green" />
      <MetricCard value={String(activeDownloads.length + seeds.length)} label={t("totalActive")} detail={`${totalPeers} ${t("peers").toLowerCase()}`} />
      <MetricCard value={formatBytesPerSec(totalDown) || "0 B/s"} label={t("downSpeed")} detail={t("currentSession")} />
      <MetricCard value={formatBytesPerSec(totalUp) || "0 B/s"} label={t("upSpeed")} detail={t("currentSession")} tone="green" />
      <MetricCard value={activeDownloads.length ? `${avgProgress}%` : t("idle")} label={t("health")} detail={activeDownloads.length ? t("avgProgress") : t("noActiveTransfer")} tone={activeDownloads.length ? "green" : "neutral"} />
    </section>
  );
}

function ResultRow({
  result,
  selected,
  actionState,
  onSelect,
  onDownload,
}: {
  result: DesktopSearchResult;
  selected: boolean;
  actionState?: ResultActionState;
  onSelect: () => void;
  onDownload: () => void;
}) {
  const t = useT();
  const actionLabel = resultActionLabel(actionState, t);
  return (
    <button className={`data-row result-row ${selected ? "selected" : ""}`} type="button" onClick={onSelect}>
      <span className="name-cell">
        <span className={`file-chip ${sourceClass(result.source)}`}>
          <FileDown size={18} />
        </span>
        <span className="result-title">
          <strong>{result.name}</strong>
          <em>{result.numFiles ? t("filesReported", { count: result.numFiles }) : healthLabel(result, t)}</em>
        </span>
      </span>
      <span>{knownBytes(result.sizeBytes, t)}</span>
      <span className="health-cell">
        <i style={{ "--bars": Math.min(5, Math.max(1, Math.ceil(result.seeders / 20))) } as React.CSSProperties} />
        <span>{healthLabel(result, t)}</span>
      </span>
      <span>
        <span className={`source-badge ${sourceClass(result.source)}`}>{result.sourceLabel}</span>
      </span>
      <span className="peers">
        <strong>{result.seeders}</strong>
        <em>:{result.leechers}</em>
      </span>
      <span>{formatRelative(result.added) || "-"}</span>
      <span className="row-menu">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDownload();
          }}
          disabled={Boolean(actionState)}
          aria-label={`${actionLabel} ${result.name}`}
          title={actionLabel}
        >
          {actionState === "downloaded" ? <CheckCircle2 size={16} /> : actionState === "seeding" ? <Upload size={16} /> : <Download size={16} />}
        </button>
      </span>
    </button>
  );
}

function ResultsPanel({
  results,
  selected,
  actionStates,
  filter,
  setFilter,
  searching,
  hasSearched,
  onSelect,
  onDownload,
  onFocusSearch,
}: {
  results: DesktopSearchResult[];
  selected: DesktopSearchResult | null;
  actionStates: Map<string, ResultActionState>;
  filter: ResultFilter;
  setFilter: (filter: ResultFilter) => void;
  searching: boolean;
  hasSearched: boolean;
  onSelect: (result: DesktopSearchResult) => void;
  onDownload: (result: DesktopSearchResult) => void;
  onFocusSearch: () => void;
}) {
  const t = useT();
  const filtered = useMemo(
    () => results.filter((result) => resultMatchesFilter(result, filter)),
    [filter, results],
  );

  return (
    <section className="table-card results-card">
      <div className="table-toolbar">
        <div className="segmented" role="tablist" aria-label={t("resultFilters")}>
          {FILTERS.map((item) => (
            <button
              className={filter === item.key ? "active" : ""}
              type="button"
              key={item.key}
              onClick={() => setFilter(item.key)}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <span className="result-count" aria-live="polite">
            {searching ? t("searchingPublic") : t("resultsShown", { shown: filtered.length, total: results.length })}
          </span>
        </div>
      </div>
      <div className="data-table search-table">
        <div className="table-head">
          <span>{t("name")}</span>
          <span>{t("size")}</span>
          <span>{t("health")}</span>
          <span>{t("source")}</span>
          <span>{t("peers")}</span>
          <span>{t("added")}</span>
          <span />
        </div>
        {searching ? (
          <div className="empty-state">
            <LoaderCircle className="spin" size={24} />
            <span>{t("searchingPublic")}</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state empty-stack">
            <Search size={24} />
            <span>{hasSearched ? t("noLiveResults") : t("runSearchToFill")}</span>
            <button className="ghost-action compact" type="button" onClick={onFocusSearch}>
              <Search size={16} />
              {t("search")}
            </button>
          </div>
        ) : (
          filtered.map((result) => (
            <ResultRow
              result={result}
              selected={selected?.id === result.id}
              actionState={actionStates.get(result.id)}
              key={result.id}
              onSelect={() => onSelect(result)}
              onDownload={() => onDownload(result)}
            />
          ))
        )}
      </div>
    </section>
  );
}

function DownloadRows({
  downloads,
  selectedId,
  setSelectedId,
  onPause,
  onResume,
  onRetry,
  onRemove,
  onOpenFolder,
}: {
  downloads: DesktopDownload[];
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  onOpenFolder: (path: string) => void;
}) {
  const t = useT();
  if (downloads.length === 0) {
    return (
      <div className="empty-state large">
        <HardDriveDownload size={28} />
        <span>{t("noDownloads")}</span>
      </div>
    );
  }

  return (
    <>
      {downloads.map((download) => (
        <button
          className={`data-row download-row ${selectedId === download.id ? "selected" : ""}`}
          type="button"
          key={download.id}
          onClick={() => setSelectedId(download.id)}
        >
          <span className="name-cell">
            <span className={`file-chip ${download.status}`}>
              {download.status === "completed" ? <CheckCircle2 size={18} /> : download.status === "paused" ? <Pause size={18} /> : <FileDown size={18} />}
            </span>
            <span>
              <strong>{download.name}</strong>
              <em>{statusText(download, t)}</em>
            </span>
          </span>
          <span>{knownBytes(download.totalBytes, t)}</span>
          <span className="progress-cell">
            <ProgressBar value={download.progress} />
            <em>{download.progress}%</em>
          </span>
          <span>{formatBytesPerSec(download.speed) || "-"}</span>
          <span>{formatEtaShort(download.eta) || "-"}</span>
          <span>{download.peers}</span>
          <span className="row-menu">
            {download.status === "failed" ? (
              <button type="button" onClick={(event) => { event.stopPropagation(); onRetry(download.id); }} aria-label={`${t("retry")} ${download.name}`}>
                <RotateCcw size={16} />
              </button>
            ) : download.status === "paused" ? (
              <button type="button" onClick={(event) => { event.stopPropagation(); onResume(download.id); }} aria-label={`${t("resume")} ${download.name}`}>
                <Play size={16} />
              </button>
            ) : (
              <button type="button" onClick={(event) => { event.stopPropagation(); onPause(download.id); }} aria-label={`${t("pause")} ${download.name}`}>
                <Pause size={16} />
              </button>
            )}
            <button type="button" onClick={(event) => { event.stopPropagation(); onOpenFolder(download.dir); }} aria-label={t("openFolderFor", { name: download.name })}>
              <Folder size={16} />
            </button>
            <button type="button" onClick={(event) => { event.stopPropagation(); onRemove(download.id); }} aria-label={t("removeItem", { name: download.name })}>
              <Trash2 size={16} />
            </button>
          </span>
        </button>
      ))}
    </>
  );
}

function DownloadsView({
  downloads,
  selectedId,
  setSelectedId,
  onPause,
  onResume,
  onRetry,
  onRemove,
  onOpenFolder,
}: {
  downloads: DesktopDownload[];
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  onOpenFolder: (path: string) => void;
}) {
  const t = useT();
  return (
    <section className="table-card view-card">
      <div className="view-heading">
        <div>
          <h1>{t("downloads")}</h1>
          <p>{t("downloadsHelp")}</p>
        </div>
        <span>{downloads.length} {t("items")}</span>
      </div>
      <div className="data-table downloads-table">
        <div className="table-head">
          <span>{t("name")}</span>
          <span>{t("size")}</span>
          <span>{t("progress")}</span>
          <span>{t("speed")}</span>
          <span>{t("eta")}</span>
          <span>{t("peers")}</span>
          <span />
        </div>
        <DownloadRows
          downloads={downloads}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          onPause={onPause}
          onResume={onResume}
          onRetry={onRetry}
          onRemove={onRemove}
          onOpenFolder={onOpenFolder}
        />
      </div>
    </section>
  );
}

function SharingView({
  seeds,
  selectedId,
  setSelectedId,
  onToggle,
  onOpenFolder,
}: {
  seeds: DesktopSeed[];
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  onToggle: (id: string) => void;
  onOpenFolder: (path: string) => void;
}) {
  const t = useT();
  return (
    <section className="table-card view-card">
      <div className="view-heading">
        <div>
          <h1>{t("seeding")}</h1>
          <p>{t("seedingHelp")}</p>
        </div>
        <span>{seeds.length} {t("items")}</span>
      </div>
      <div className="data-table seeds-table">
        <div className="table-head">
          <span>{t("name")}</span>
          <span>{t("size")}</span>
          <span>{t("uploaded")}</span>
          <span>{t("speed")}</span>
          <span>{t("peers")}</span>
          <span>{t("state")}</span>
          <span />
        </div>
        {seeds.length === 0 ? (
          <div className="empty-state large">
            <Upload size={28} />
            <span>{t("noActiveSeeds")}</span>
          </div>
        ) : (
          seeds.map((seed) => (
            <button
              className={`data-row seed-row ${selectedId === seed.id ? "selected" : ""}`}
              type="button"
              key={seed.id}
              onClick={() => setSelectedId(seed.id)}
            >
              <span className="name-cell">
                <span className={`file-chip ${sourceClass(seed.source)}`}>
                  <Upload size={18} />
                </span>
                <span>
                  <strong>{seed.name}</strong>
                  <em>{seed.source ?? t("local")}</em>
                </span>
              </span>
              <span>{knownBytes(seed.sizeBytes, t)}</span>
              <span>{knownBytes(seed.uploaded, t)}</span>
              <span>{formatBytesPerSec(seed.uploadSpeed) || "-"}</span>
              <span>{seed.peers}</span>
              <span>{seed.status}</span>
              <span className="row-menu">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggle(seed.id);
                  }}
                  aria-label={seed.status === "seeding" ? `${t("pause")} ${seed.name}` : `${t("resume")} ${seed.name}`}
                >
                  {seed.status === "seeding" ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenFolder(seed.dir);
                  }}
                  aria-label={t("openFolderFor", { name: seed.name })}
                >
                  <Folder size={16} />
                </button>
              </span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function HistoryView({
  history,
  seeds,
  selectedId,
  setSelectedId,
  onToggleSeed,
  onRemove,
  onClear,
  onOpenFolder,
}: {
  history: DesktopHistoryItem[];
  seeds: DesktopSeed[];
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  onToggleSeed: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onOpenFolder: (path: string) => void;
}) {
  const t = useT();
  const seedById = new Map(seeds.map((seed) => [seed.id, seed]));
  return (
    <section className="table-card view-card">
      <div className="view-heading">
        <div>
          <h1>{t("history")}</h1>
          <p>{t("historyHelp")}</p>
        </div>
        {history.length > 0 ? (
          <button className="ghost-action danger" type="button" onClick={onClear}>
            <Trash2 size={16} />
            {t("clear")}
          </button>
        ) : (
          <span>0 {t("items")}</span>
        )}
      </div>
      <div className="data-table history-table">
        <div className="table-head">
          <span>{t("name")}</span>
          <span>{t("size")}</span>
          <span>{t("source")}</span>
          <span>{t("completed")}</span>
          <span>{t("sharing")}</span>
          <span>{t("peers")}</span>
          <span />
        </div>
        {history.length === 0 ? (
          <div className="empty-state large">
            <History size={28} />
            <span>{t("noCompletedDownloads")}</span>
          </div>
        ) : (
          history.map((item) => {
            const seed = seedById.get(item.id);
            return (
              <button
                className={`data-row history-row ${selectedId === item.id ? "selected" : ""}`}
                type="button"
                key={item.id}
                onClick={() => setSelectedId(item.id)}
              >
                <span className="name-cell">
                  <span className={`file-chip ${sourceClass(item.source)}`}>
                    <CheckCircle2 size={18} />
                  </span>
                  <span>
                    <strong>{item.name}</strong>
                    <em>{item.dir}</em>
                  </span>
                </span>
                <span>{knownBytes(item.sizeBytes)}</span>
                <span>{item.source ?? t("local")}</span>
                <span>{relativeMillis(item.completedAt) || t("completed")}</span>
                <span>{seed?.status ?? t("ready")}</span>
                <span>{seed?.peers ?? "-"}</span>
                <span className="row-menu">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleSeed(item.id);
                    }}
                    aria-label={seed?.status === "seeding" ? `${t("pauseSharing")} ${item.name}` : t("startSharing", { name: item.name })}
                  >
                    {seed?.status === "seeding" ? <Pause size={16} /> : <Upload size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenFolder(item.dir);
                    }}
                    aria-label={t("openFolderFor", { name: item.name })}
                  >
                    <Folder size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemove(item.id);
                    }}
                    aria-label={t("removeItem", { name: item.name })}
                  >
                    <Trash2 size={16} />
                  </button>
                </span>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}

function SettingsView({
  draft,
  setDraft,
  language,
  theme,
  customName,
  setCustomName,
  customUrl,
  setCustomUrl,
  customSources,
  onChoose,
  onSave,
  onSetLanguage,
  onSetTheme,
  onAddSource,
  onToggleSource,
  onRemoveSource,
  onCheckSources,
}: {
  draft: string;
  setDraft: (value: string) => void;
  language: DesktopLanguage;
  theme: DesktopTheme;
  customName: string;
  setCustomName: (value: string) => void;
  customUrl: string;
  setCustomUrl: (value: string) => void;
  customSources: DesktopSnapshot["config"]["customSources"];
  onChoose: () => void;
  onSave: () => void;
  onSetLanguage: (language: DesktopLanguage) => void;
  onSetTheme: (theme: DesktopTheme) => void;
  onAddSource: () => void;
  onToggleSource: (id: string) => void;
  onRemoveSource: (id: string) => void;
  onCheckSources: () => void;
}) {
  const t = useT();
  return (
    <section className="settings-card view-card">
      <div className="view-heading">
        <div>
          <h1>{t("settings")}</h1>
          <p>{t("settingsHelp")}</p>
        </div>
        <button className="ghost-action" type="button" onClick={onCheckSources}>
          <Wifi size={16} />
          {t("checkSources")}
        </button>
      </div>
      <div className="settings-section appearance-settings">
        <div className="setting-row">
          <span>{t("language")}</span>
          <div className="setting-options">
            <button className={language === "en" ? "active" : ""} type="button" onClick={() => onSetLanguage("en")}>
              {t("english")}
            </button>
            <button className={language === "zh" ? "active" : ""} type="button" onClick={() => onSetLanguage("zh")}>
              {t("chinese")}
            </button>
          </div>
        </div>
        <div className="setting-row">
          <span>{t("theme")}</span>
          <div className="setting-options">
            <button className={theme === "dark" ? "active" : ""} type="button" onClick={() => onSetTheme("dark")}>
              {t("dark")}
            </button>
            <button className={theme === "light" ? "active" : ""} type="button" onClick={() => onSetTheme("light")}>
              {t("light")}
            </button>
          </div>
        </div>
      </div>
      <div className="settings-section">
        <label className="setting-row">
          <span>{t("downloadFolder")}</span>
          <div>
            <input
              value={draft}
              onChange={(event) => setDraft(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSave();
              }}
            />
            <button type="button" onClick={onChoose}>
              {t("choose")}
            </button>
            <button type="button" onClick={onSave}>
              {t("save")}
            </button>
          </div>
        </label>
      </div>
      <div className="settings-section source-settings">
        <div className="settings-subhead">
          <div>
            <h2>{t("customRssSources")}</h2>
            <p>{t("customRssHelp")}</p>
          </div>
        </div>
        <div className="custom-source-form">
          <label>
            <span>{t("sourceName")}</span>
            <input
              value={customName}
              onChange={(event) => setCustomName(event.currentTarget.value)}
              placeholder={t("mySource")}
            />
          </label>
          <label>
            <span>{t("rssSearchUrl")}</span>
            <input
              value={customUrl}
              onChange={(event) => setCustomUrl(event.currentTarget.value)}
              placeholder="https://example.com/rss?q={query}"
            />
          </label>
          <button type="button" onClick={onAddSource}>
            <Plus size={16} />
            {t("addSource")}
          </button>
        </div>
        <div className="custom-source-list">
          {customSources.length === 0 ? (
            <div className="mini-empty">{t("noCustomSources")}</div>
          ) : (
            customSources.map((source) => (
              <div className="custom-source-item" key={source.id}>
                <div>
                  <strong>{source.label}</strong>
                  <span>{source.url}</span>
                </div>
                <button type="button" onClick={() => onToggleSource(source.id)}>
                  {source.enabled ? t("enabled") : t("disabled")}
                </button>
                <button className="danger" type="button" onClick={() => onRemoveSource(source.id)}>
                  <Trash2 size={15} />
                  {t("remove")}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function Inspector({
  mode,
  result,
  resultActionState,
  download,
  seed,
  historyItem,
  tab,
  setTab,
  downloadDir,
  onStartResult,
  onChooseDir,
  onToggleSeed,
  onPause,
  onResume,
  onRetry,
  onRemove,
  onOpenFolder,
}: {
  mode: Section;
  result: DesktopSearchResult | null;
  resultActionState?: ResultActionState;
  download: DesktopDownload | null;
  seed: DesktopSeed | null;
  historyItem: DesktopHistoryItem | null;
  tab: DetailsTab;
  setTab: (tab: DetailsTab) => void;
  downloadDir: string;
  onStartResult: () => void;
  onChooseDir: () => void;
  onToggleSeed: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  onOpenFolder: (path: string) => void;
}) {
  const t = useT();

  if (result) {
    const actionLabel = resultActionLabel(resultActionState, t);
    return (
      <aside className="inspector">
        <div className={`inspector-art ${sourceClass(result.source)}`}>
          <FileDown size={54} />
        </div>
        <h2>{result.name}</h2>
        <p>{result.sourceLabel}</p>
        <span className="verified-pill">
          <ShieldCheck size={15} />
          {t("sourceResult")}
        </span>
        <button className="start-download" type="button" onClick={onStartResult} disabled={Boolean(resultActionState)}>
          {resultActionState === "downloaded" ? <CheckCircle2 size={18} /> : resultActionState === "seeding" ? <Upload size={18} /> : <Download size={18} />}
          {actionLabel}
        </button>
        <div className="detail-tabs" role="tablist">
          {(["overview", "files", "peers", "source"] as const).map((item) => (
            <button className={tab === item ? "active" : ""} type="button" key={item} onClick={() => setTab(item)}>
              {item === "files" ? `${t("files")} (${result.numFiles ?? "?"})` : t(item)}
            </button>
          ))}
        </div>
        {tab === "overview" ? (
          <div className="detail-list">
            <div>
              <span>{t("size")}</span>
              <strong>{knownBytes(result.sizeBytes, t)}</strong>
            </div>
            <div>
              <span>{t("health")}</span>
              <strong>{healthLabel(result, t)}</strong>
            </div>
            <div>
              <span>{t("speedEstimate")}</span>
              <strong>{speedHint(result, t)}</strong>
            </div>
            <div>
              <span>{t("saveTo")}</span>
              <button type="button" onClick={onChooseDir}>{downloadDir || t("chooseFolder")}</button>
            </div>
          </div>
        ) : tab === "files" ? (
          <div className="detail-list">
            <div>
              <span>{t("metadata")}</span>
              <strong>{result.numFiles ? t("filesReported", { count: result.numFiles }) : t("metadataAfterFetch")}</strong>
            </div>
          </div>
        ) : tab === "peers" ? (
          <div className="detail-list">
            <div>
              <span>{t("seeders")}</span>
              <strong>{result.seeders}</strong>
            </div>
            <div>
              <span>{t("leechers")}</span>
              <strong>{result.leechers}</strong>
            </div>
          </div>
        ) : (
          <div className="detail-list">
            <div>
              <span>{t("magnet")}</span>
              <strong className="magnet-line">{result.magnet}</strong>
            </div>
          </div>
        )}
      </aside>
    );
  }

  if (download) {
    return (
      <aside className="inspector">
        <div className={`inspector-art ${download.status}`}>
          <HardDriveDownload size={54} />
        </div>
        <h2>{download.name}</h2>
        <p>{statusText(download, t)}</p>
        <span className="verified-pill">
          <Gauge size={15} />
          {t("progress")} {download.progress}%
        </span>
        <div className="inspector-actions">
          {download.status === "failed" ? (
            <button className="start-download" type="button" onClick={() => onRetry(download.id)}>
              <RotateCcw size={18} />
              {t("retry")}
            </button>
          ) : download.status === "paused" ? (
            <button className="start-download" type="button" onClick={() => onResume(download.id)}>
              <Play size={18} />
              {t("resume")}
            </button>
          ) : (
            <button className="start-download" type="button" onClick={() => onPause(download.id)}>
              <Pause size={18} />
              {t("pause")}
            </button>
          )}
          <button className="ghost-action wide danger" type="button" onClick={() => onRemove(download.id)}>
            <Trash2 size={17} />
            {t("remove")}
          </button>
        </div>
        <div className="detail-list">
          <div>
            <span>{t("size")}</span>
            <strong>{knownBytes(download.totalBytes, t)}</strong>
          </div>
          <div>
            <span>{t("downloaded")}</span>
            <strong>{knownBytes(download.downloadedBytes, t)}</strong>
          </div>
          <div>
            <span>{t("progress")}</span>
            <strong>{download.progress}%</strong>
          </div>
          <ProgressBar value={download.progress} />
          <div>
            <span>{t("downSpeed")}</span>
            <strong>{formatBytesPerSec(download.speed) || "0 B/s"}</strong>
          </div>
          <div>
            <span>{t("eta")}</span>
            <strong>{formatEtaShort(download.eta) || "-"}</strong>
          </div>
          <div>
            <span>{t("peers")}</span>
            <strong>{download.peers}</strong>
          </div>
        </div>
        <button className="ghost-action wide" type="button" onClick={() => onOpenFolder(download.dir)}>
          <Folder size={17} />
          {t("openFileLocation")}
        </button>
      </aside>
    );
  }

  if (seed) {
    const seedStatus = seed.status === "seeding" ? t("seeding") : t("paused");
    return (
      <aside className="inspector">
        <div className={`inspector-art ${sourceClass(seed.source)}`}>
          <Upload size={54} />
        </div>
        <h2>{seed.name}</h2>
        <p>{seedStatus}</p>
        <span className="verified-pill">
          <Wifi size={15} />
          {seed.peers} {t("peers").toLowerCase()}
        </span>
        <div className="inspector-actions">
          <button className="start-download" type="button" onClick={() => onToggleSeed(seed.id)}>
            {seed.status === "seeding" ? <Pause size={18} /> : <Play size={18} />}
            {seed.status === "seeding" ? t("pauseSharing") : t("resumeSharing")}
          </button>
        </div>
        <div className="detail-list">
          <div>
            <span>{t("size")}</span>
            <strong>{knownBytes(seed.sizeBytes, t)}</strong>
          </div>
          <div>
            <span>{t("uploaded")}</span>
            <strong>{knownBytes(seed.uploaded, t)}</strong>
          </div>
          <div>
            <span>{t("upSpeed")}</span>
            <strong>{formatBytesPerSec(seed.uploadSpeed) || "0 B/s"}</strong>
          </div>
          <div>
            <span>{t("source")}</span>
            <strong>{seed.source ?? t("local")}</strong>
          </div>
        </div>
        <button className="ghost-action wide" type="button" onClick={() => onOpenFolder(seed.dir)}>
          <Folder size={17} />
          {t("openFileLocation")}
        </button>
      </aside>
    );
  }

  if (historyItem) {
    return (
      <aside className="inspector">
        <div className={`inspector-art ${sourceClass(historyItem.source)}`}>
          <CheckCircle2 size={54} />
        </div>
        <h2>{historyItem.name}</h2>
        <p>{relativeMillis(historyItem.completedAt) || t("completed")}</p>
        <span className="verified-pill">
          <History size={15} />
          {t("completed")}
        </span>
        <div className="inspector-actions">
          <button className="start-download" type="button" onClick={() => onToggleSeed(historyItem.id)}>
            <Upload size={18} />
            {t("toggleSharing")}
          </button>
        </div>
        <div className="detail-list">
          <div>
            <span>{t("size")}</span>
            <strong>{knownBytes(historyItem.sizeBytes, t)}</strong>
          </div>
          <div>
            <span>{t("source")}</span>
            <strong>{historyItem.source ?? t("local")}</strong>
          </div>
          <div>
            <span>{t("folder")}</span>
            <strong>{historyItem.dir}</strong>
          </div>
        </div>
        <button className="ghost-action wide" type="button" onClick={() => onOpenFolder(historyItem.dir)}>
          <Folder size={17} />
          {t("openFileLocation")}
        </button>
      </aside>
    );
  }

  if (mode === "settings") {
    return (
      <aside className="inspector">
        <div className="inspector-art purple">
          <Settings size={54} />
        </div>
        <h2>{t("settings")}</h2>
        <p>{t("storage")}</p>
        <span className="verified-pill">
          <Folder size={15} />
          {t("saveLocation")}
        </span>
        <div className="detail-list">
          <div>
            <span>{t("downloadFolder")}</span>
            <strong>{downloadDir || t("noDownloadFolder")}</strong>
          </div>
          <div>
            <span>{t("tip")}</span>
            <strong>{t("localFolderTip")}</strong>
          </div>
        </div>
        <button className="start-download" type="button" onClick={onChooseDir}>
          <FolderOpen size={18} />
          {t("changeFolder")}
        </button>
      </aside>
    );
  }

  return (
    <aside className="inspector empty-inspector">
      <ShieldCheck size={28} />
      <h2>{t("noItemSelected")}</h2>
      <p>{t("selectToInspect")}</p>
    </aside>
  );
}

export function App() {
  const [snapshot, setSnapshot] = useState<DesktopSnapshot | null>(null);
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<Section>("home");
  const [filter, setFilter] = useState<ResultFilter>("all");
  const [detailsTab, setDetailsTab] = useState<DetailsTab>("overview");
  const [results, setResults] = useState<DesktopSearchResult[]>([]);
  const [selected, setSelected] = useState<DesktopSearchResult | null>(null);
  const [selectedDownloadId, setSelectedDownloadId] = useState<string | null>(null);
  const [selectedSeedId, setSelectedSeedId] = useState<string | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [sourceStates, setSourceStates] = useState<SourceSearchState[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [notice, setNotice] = useState<DesktopNotice | null>(null);
  const [downloadDirDraft, setDownloadDirDraft] = useState("");
  const [customSourceName, setCustomSourceName] = useState("");
  const [customSourceUrl, setCustomSourceUrl] = useState("");
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const heroSearchRef = useRef<HTMLInputElement>(null);
  const quickSearchRef = useRef<HTMLInputElement>(null);
  const language = snapshot?.config.language ?? "en";
  const theme = snapshot?.config.theme ?? "dark";
  const t = useMemo(() => createTranslator(language), [language]);

  useEffect(() => {
    let alive = true;
    void seeddeckApi
      .getSnapshot()
      .then((next) => {
        if (!alive) return;
        setSnapshot(next);
        setSourceStates(next.sources);
      })
      .catch((error) => {
        if (!alive) return;
        setSnapshot({
          config: { downloadDir: "", customSources: [], language: "en", theme: "dark" },
          downloads: [],
          history: [],
          seeds: [],
          sources: [],
        });
        setNotice({
          tone: "danger",
          message: error instanceof Error ? error.message : String(error),
        });
      });
    const offSnapshot = seeddeckApi.onSnapshot((next) => {
      setSnapshot(next);
      setSourceStates(next.sources);
    });
    const offNotice = seeddeckApi.onNotice((next) => setNotice(next));
    return () => {
      alive = false;
      offSnapshot();
      offNotice();
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!hasDesktopBridge) {
      setNotice({ tone: "danger", message: t("bridgeUnavailable") || desktopBridgeUnavailableMessage });
    }
  }, [t]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        cancelDropOverlay();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        focusSearch();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", cancelDropOverlay);
    window.addEventListener("dragend", cancelDropOverlay);
    window.addEventListener("drop", cancelDropOverlay);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", cancelDropOverlay);
      window.removeEventListener("dragend", cancelDropOverlay);
      window.removeEventListener("drop", cancelDropOverlay);
    };
  }, []);

  const downloads = snapshot?.downloads ?? [];
  const history = snapshot?.history ?? [];
  const seeds = snapshot?.seeds ?? [];
  const activeDownloads = downloads.filter((download) => download.status !== "completed");
  const totalDown = activeDownloads.reduce((sum, download) => sum + download.speed, 0);
  const totalUp = seeds.reduce((sum, seed) => sum + seed.uploadSpeed, 0);
  const totalPeers =
    activeDownloads.reduce((sum, download) => sum + download.peers, 0) +
    seeds.reduce((sum, seed) => sum + seed.peers, 0);
  const downloadDir = snapshot?.config.downloadDir ?? "";
  const customSources = snapshot?.config.customSources ?? [];
  const resultActionStates = useMemo(() => {
    const states = new Map<string, ResultActionState>();
    for (const item of downloads) {
      if (item.status !== "failed") states.set(item.id, "queued");
    }
    for (const item of history) {
      if (!states.has(item.id)) states.set(item.id, "downloaded");
    }
    for (const seed of seeds) {
      states.set(seed.id, seed.status === "seeding" ? "seeding" : "downloaded");
    }
    return states;
  }, [downloads, history, seeds]);
  const selectedDownload = downloads.find((download) => download.id === selectedDownloadId) ?? activeDownloads[0] ?? downloads[0] ?? null;
  const selectedSeed = seeds.find((seed) => seed.id === selectedSeedId) ?? seeds[0] ?? null;
  const selectedHistoryItem = history.find((item) => item.id === selectedHistoryId) ?? history[0] ?? null;
  const inspectorResult = section === "home" ? selected : null;
  const inspectorDownload = !selected && (section === "home" || section === "downloads") ? selectedDownload : null;
  const inspectorSeed = section === "sharing" ? selectedSeed : null;
  const inspectorHistoryItem = section === "history" ? selectedHistoryItem : null;

  useEffect(() => {
    setDownloadDirDraft(downloadDir);
  }, [downloadDir]);

  useEffect(() => {
    if (!selectedDownloadId && downloads[0]) {
      setSelectedDownloadId(downloads[0].id);
    }
  }, [downloads, selectedDownloadId]);

  async function refresh(next: Promise<DesktopSnapshot | null>): Promise<void> {
    try {
      const value = await next;
      if (value) setSnapshot(value);
    } catch (error) {
      setNotice({
        tone: "danger",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function focusSearch(): void {
    setSection("home");
    setSelected(null);
    window.setTimeout(() => {
      (heroSearchRef.current ?? quickSearchRef.current)?.focus();
    }, 0);
  }

  function cancelDropOverlay(): void {
    dragDepth.current = 0;
    setDragging(false);
  }

  function isImportDrag(event: DragEvent<HTMLElement>): boolean {
    const types = [...event.dataTransfer.types];
    return types.includes("Files") || types.includes("text/uri-list") || types.includes("text/plain");
  }

  async function runSearch(nextQuery = query): Promise<void> {
    const q = nextQuery.trim();
    if (!q) {
      setNotice({ tone: "warning", message: t("enterSearch") });
      focusSearch();
      return;
    }
    if (isMagnet(q)) {
      await refresh(seeddeckApi.addMagnet(q));
      setQuery("");
      setSelected(null);
      setSection("downloads");
      return;
    }
    setSearching(true);
    setSection("home");
    try {
      const response = await seeddeckApi.search(q);
      setResults(response.results);
      setSelected(response.results[0] ?? null);
      setSourceStates(response.sources);
      setHasSearched(true);
      setDetailsTab("overview");
      if (response.results.length === 0) {
        setNotice({ tone: "warning", message: t("noResultsFor", { query: q }) });
      }
    } catch (error) {
      setNotice({
        tone: "danger",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSearching(false);
    }
  }

  async function pasteLink(): Promise<void> {
    try {
      const text = (await seeddeckApi.readClipboard()).trim();
      if (!text) {
        setNotice({ tone: "warning", message: t("clipboardEmpty") });
        return;
      }
      setQuery(text);
      if (isMagnet(text)) {
        await refresh(seeddeckApi.addMagnet(text));
        setQuery("");
        setSelected(null);
        setSection("downloads");
      }
    } catch (error) {
      setNotice({ tone: "danger", message: error instanceof Error ? error.message : String(error) });
    }
  }

  async function openTorrentFile(): Promise<void> {
    cancelDropOverlay();
    try {
      const next = await seeddeckApi.addTorrentFile();
      if (next) {
        setSnapshot(next);
        setSelected(null);
        setSection("downloads");
      }
    } catch (error) {
      setNotice({ tone: "danger", message: error instanceof Error ? error.message : String(error) });
    }
  }

  async function saveDownloadDir(): Promise<void> {
    const next = downloadDirDraft.trim();
    if (!next) {
      setNotice({ tone: "warning", message: t("downloadFolderBlank") });
      return;
    }
    await refresh(seeddeckApi.setDownloadDir(next));
  }

  async function addCustomSource(): Promise<void> {
    const label = customSourceName.trim();
    const url = customSourceUrl.trim();
    if (!label || !url) {
      setNotice({ tone: "warning", message: t("sourceNameUrl") });
      return;
    }
    await refresh(seeddeckApi.addCustomSource({ label, url }));
    setCustomSourceName("");
    setCustomSourceUrl("");
  }

  async function downloadResult(result: DesktopSearchResult | null): Promise<void> {
    if (!result) return;
    await refresh(
      seeddeckApi.addDownload({
        id: result.id,
        name: result.name,
        magnet: result.magnet,
        source: result.source,
        sizeBytes: result.sizeBytes,
      }),
    );
    setSelected(null);
    setSection("downloads");
  }

  async function addDroppedTorrent(path: string): Promise<void> {
    await refresh(seeddeckApi.addTorrentPath(path));
    setSelected(null);
    setSection("downloads");
  }

  async function changeLanguage(nextLanguage: DesktopLanguage): Promise<void> {
    await refresh(seeddeckApi.setLanguage(nextLanguage));
  }

  async function changeTheme(nextTheme: DesktopTheme): Promise<void> {
    await refresh(seeddeckApi.setTheme(nextTheme));
  }

  async function handleDrop(event: DragEvent<HTMLElement>): Promise<void> {
    event.preventDefault();
    cancelDropOverlay();
    const text = event.dataTransfer.getData("text/uri-list") || event.dataTransfer.getData("text/plain");
    if (isMagnet(text)) {
      await refresh(seeddeckApi.addMagnet(text));
      setSelected(null);
      setSection("downloads");
      return;
    }

    const files = [...event.dataTransfer.files];
    const torrentFiles = files.filter((file) => file.name.toLowerCase().endsWith(".torrent"));
    if (torrentFiles.length === 0) {
      setNotice({ tone: "warning", message: t("dropTorrent") });
      return;
    }

    for (const file of torrentFiles) {
      const filePath = (file as File & { path?: string }).path;
      if (!filePath) {
        setNotice({ tone: "danger", message: t("droppedPathMissing") });
        continue;
      }
      await addDroppedTorrent(filePath);
    }
  }

  function onWindowAction(action: () => Promise<void>): void {
    void action().catch((error) => {
      setNotice({ tone: "danger", message: error instanceof Error ? error.message : String(error) });
    });
  }

  useEffect(
    () =>
      seeddeckApi.onCommand((command) => {
        if (command === "focus-search") {
          focusSearch();
        } else if (command === "paste-link") {
          void pasteLink();
        } else if (command === "open-torrent") {
          void openTorrentFile();
        } else if (command === "show-downloads") {
          setSelected(null);
          setSection("downloads");
        } else if (command === "show-settings") {
          setSelected(null);
          setSection("settings");
        }
      }),
    [],
  );

  if (!snapshot) {
    return (
      <main className="app loading-screen" data-theme={theme} lang={language}>
        <LoaderCircle className="spin" size={34} />
        <span>{t("appStarting")}</span>
      </main>
    );
  }

  return (
    <TranslationContext.Provider value={t}>
    <main
      className={`app ${dragging ? "dragging" : ""}`}
      data-theme={theme}
      lang={language}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!isImportDrag(event)) return;
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => {
        if (!isImportDrag(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDrop={(event) => void handleDrop(event)}
    >
      <div className={`desktop-shell ${section === "home" ? "home-shell" : ""}`}>
        <Sidebar
          section={section}
          setSection={(next) => {
            setSelected(null);
            setSection(next);
          }}
          downloads={downloads}
          activeDownloads={activeDownloads}
          seeds={seeds}
          history={history}
          sourceStates={sourceStates}
        />
        <TopBar
          section={section}
          query={query}
          setQuery={setQuery}
          searching={searching}
          onSearch={() => void runSearch()}
          setSection={(next) => {
            setSelected(null);
            setSection(next);
          }}
          onWindowAction={onWindowAction}
          inputRef={quickSearchRef}
        />
        <section className="main-stage">
          <div className={`content-scroll ${section === "home" ? "home-scroll" : ""}`}>
            {section === "home" ? (
              <>
                <SearchHero
                  query={query}
                  setQuery={setQuery}
                  searching={searching}
                  onSearch={() => void runSearch()}
                  onPaste={() => void pasteLink()}
                  onOpenTorrent={() => void openTorrentFile()}
                  inputRef={heroSearchRef}
                />
                <MetricsStrip
                  activeDownloads={activeDownloads}
                  seeds={seeds}
                  totalDown={totalDown}
                  totalUp={totalUp}
                  totalPeers={totalPeers}
                />
                <ResultsPanel
                  results={results}
                  selected={selected}
                  actionStates={resultActionStates}
                  filter={filter}
                  setFilter={setFilter}
                  searching={searching}
                  hasSearched={hasSearched}
                  onSelect={(result) => {
                    setSelected(result);
                    setDetailsTab("overview");
                  }}
                  onDownload={(result) => void downloadResult(result)}
                  onFocusSearch={focusSearch}
                />
              </>
            ) : section === "downloads" ? (
              <DownloadsView
                downloads={downloads}
                selectedId={selectedDownload?.id ?? null}
                setSelectedId={setSelectedDownloadId}
                onPause={(id) => void refresh(seeddeckApi.pauseDownload(id))}
                onResume={(id) => void refresh(seeddeckApi.resumeDownload(id))}
                onRetry={(id) => void refresh(seeddeckApi.retryDownload(id))}
                onRemove={(id) => {
                  const item = downloads.find((download) => download.id === id);
                  if (window.confirm(t("removeDownloadConfirm", { name: item?.name ?? t("unknown") }))) {
                    void refresh(seeddeckApi.removeDownload(id));
                  }
                }}
                onOpenFolder={(target) => void seeddeckApi.openPath(target)}
              />
            ) : section === "sharing" ? (
              <SharingView
                seeds={seeds}
                selectedId={selectedSeed?.id ?? null}
                setSelectedId={setSelectedSeedId}
                onToggle={(id) => void refresh(seeddeckApi.toggleSeeding(id))}
                onOpenFolder={(target) => void seeddeckApi.openPath(target)}
              />
            ) : section === "history" ? (
              <HistoryView
                history={history}
                seeds={seeds}
                selectedId={selectedHistoryItem?.id ?? null}
                setSelectedId={setSelectedHistoryId}
                onToggleSeed={(id) => void refresh(seeddeckApi.toggleSeeding(id))}
                onRemove={(id) => {
                  const item = history.find((entry) => entry.id === id);
                  if (window.confirm(t("removeHistoryConfirm", { name: item?.name ?? t("unknown") }))) {
                    void refresh(seeddeckApi.removeHistory(id));
                  }
                }}
                onClear={() => {
                  if (window.confirm(t("clearHistoryConfirm"))) void refresh(seeddeckApi.clearHistory());
                }}
                onOpenFolder={(target) => void seeddeckApi.openPath(target)}
              />
            ) : (
              <SettingsView
                draft={downloadDirDraft}
                setDraft={setDownloadDirDraft}
                customName={customSourceName}
                setCustomName={setCustomSourceName}
                customUrl={customSourceUrl}
                setCustomUrl={setCustomSourceUrl}
                customSources={customSources}
                language={language}
                theme={theme}
                onChoose={() => void refresh(seeddeckApi.chooseDownloadDir())}
                onSave={() => void saveDownloadDir()}
                onSetLanguage={(nextLanguage) => void changeLanguage(nextLanguage)}
                onSetTheme={(nextTheme) => void changeTheme(nextTheme)}
                onAddSource={() => void addCustomSource()}
                onToggleSource={(id) => void refresh(seeddeckApi.toggleCustomSource(id))}
                onRemoveSource={(id) => {
                  if (window.confirm(t("removeCustomSourceConfirm"))) void refresh(seeddeckApi.removeCustomSource(id));
                }}
                onCheckSources={() => void refresh(seeddeckApi.checkSources())}
              />
            )}
          </div>
        </section>
        <Inspector
          mode={section}
          result={inspectorResult}
          resultActionState={inspectorResult ? resultActionStates.get(inspectorResult.id) : undefined}
          download={inspectorDownload}
          seed={inspectorSeed}
          historyItem={inspectorHistoryItem}
          tab={detailsTab}
          setTab={setDetailsTab}
          downloadDir={downloadDir}
          onStartResult={() => void downloadResult(selected)}
          onChooseDir={() => void refresh(seeddeckApi.chooseDownloadDir())}
          onToggleSeed={(id) => void refresh(seeddeckApi.toggleSeeding(id))}
          onPause={(id) => void refresh(seeddeckApi.pauseDownload(id))}
          onResume={(id) => void refresh(seeddeckApi.resumeDownload(id))}
          onRetry={(id) => void refresh(seeddeckApi.retryDownload(id))}
          onRemove={(id) => {
            const item = downloads.find((download) => download.id === id);
            if (window.confirm(t("removeDownloadConfirm", { name: item?.name ?? t("unknown") }))) {
              void refresh(seeddeckApi.removeDownload(id));
            }
          }}
          onOpenFolder={(target) => void seeddeckApi.openPath(target)}
        />
        <footer className="statusbar">
          <span>
            <Wifi size={13} />
            {hasDesktopBridge ? t("connected") : t("bridgeUnavailable")}
          </span>
          <span>D {formatBytesPerSec(totalDown) || "0 B/s"}</span>
          <span>U {formatBytesPerSec(totalUp) || "0 B/s"}</span>
          <span>{t("peers")} {totalPeers}</span>
          <span>{downloadDir || t("noDownloadFolder")}</span>
        </footer>
      </div>
      <Toast notice={notice} onClose={() => setNotice(null)} />
      {dragging ? (
        <div
          className="drop-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={t("dropImport")}
          onClick={(event) => {
            if (event.currentTarget === event.target) cancelDropOverlay();
          }}
        >
          <div className="drop-overlay-panel">
            <FileDown size={32} />
            <span>{t("dropImport")}</span>
            <p>{t("dropTorrent")}</p>
            <button type="button" onClick={cancelDropOverlay}>
              <X size={16} />
              {t("cancelImport")}
            </button>
          </div>
        </div>
      ) : null}
    </main>
    </TranslationContext.Provider>
  );
}

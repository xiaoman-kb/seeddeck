import { describe, it, expect } from "vitest";
import {
  formatBytes,
  parseSize,
  formatBytesPerSec,
  formatRelative,
  formatEtaShort,
  cleanText,
  truncate,
} from "./format";

describe("formatBytes", () => {
  it("formats across units", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(933)).toBe("933 B");
    expect(formatBytes(1024)).toBe("1.00 KB");
    expect(formatBytes(2.1e9)).toBe("1.96 GB");
    expect(formatBytes(undefined)).toBe("0 B");
  });
});

describe("parseSize", () => {
  it("parses human sizes to bytes", () => {
    expect(parseSize("1.4 GiB")).toBe(Math.round(1.4 * 1024 ** 3));
    expect(parseSize("700 MB")).toBe(700_000_000);
    expect(parseSize("350.2 MiB")).toBe(Math.round(350.2 * 1024 ** 2));
    expect(parseSize("nothing here")).toBe(0);
  });
});

describe("formatBytesPerSec", () => {
  it("formats rates and blanks zero", () => {
    expect(formatBytesPerSec(0)).toBe("");
    expect(formatBytesPerSec(5.2e6)).toMatch(/MB\/s$/);
  });
});

describe("formatRelative", () => {
  it("describes recent times", () => {
    const now = Date.now() / 1000;
    expect(formatRelative(now - 30)).toBe("now");
    expect(formatRelative(now - 125)).toBe("2m ago");
    expect(formatRelative(0)).toBe("");
  });
});

describe("formatEtaShort", () => {
  it("formats remaining time compactly", () => {
    expect(formatEtaShort(45)).toBe("45s");
    expect(formatEtaShort(125)).toBe("2m 5s");
    expect(formatEtaShort(3725)).toBe("1hr 2m");
    expect(formatEtaShort(90061)).toBe("1d 1hr 1m");
    expect(formatEtaShort(undefined)).toBe("");
  });
});

describe("cleanText", () => {
  it("strips junk glyphs and collapses whitespace", () => {
    expect(cleanText("Foo 🎬 Bar")).toBe("Foo Bar");
    expect(cleanText("🎬🎬")).toBe("Untitled");
  });
});

describe("truncate", () => {
  it("truncates with an ellipsis", () => {
    expect(truncate("hello world", 5)).toBe("hell…");
    expect(truncate("hi", 5)).toBe("hi");
  });
});

import path from "node:path";
import { describe, expect, it } from "vitest";
import { expandHome, normalizeDownloadDir } from "./folder";

const HOME = path.join(path.sep, "home", "ada");

describe("expandHome", () => {
  it("maps a bare tilde to the home directory", () => {
    expect(expandHome("~", HOME)).toBe(HOME);
  });

  it("expands a leading ~/ segment", () => {
    expect(expandHome("~/Movies", HOME)).toBe(path.join(HOME, "Movies"));
  });

  it("expands a leading ~\\ segment for paths typed on Windows", () => {
    expect(expandHome("~\\Movies", HOME)).toBe(path.join(HOME, "Movies"));
  });

  it("leaves an absolute path untouched apart from trimming", () => {
    const abs = path.join(path.sep, "mnt", "media");
    expect(expandHome(`  ${abs}  `, HOME)).toBe(abs);
  });

  it("does not expand a tilde that is not a path prefix", () => {
    expect(expandHome("~weird", HOME)).toBe("~weird");
  });
});

describe("normalizeDownloadDir", () => {
  it("returns an empty string for blank input", () => {
    expect(normalizeDownloadDir("   ", HOME)).toBe("");
  });

  it("normalizes a tilde path into a usable directory", () => {
    expect(normalizeDownloadDir("~/Downloads/seeddeck", HOME)).toBe(
      path.normalize(path.join(HOME, "Downloads", "seeddeck")),
    );
  });
});

import { describe, it, expect } from "vitest";
import { reconcileQueue } from "./reconcile";
import type { QueueItem } from "./types";

function item(over: Partial<QueueItem>): QueueItem {
  return {
    id: "x",
    name: "n",
    magnet: "m",
    dir: "d",
    status: "downloading",
    progress: 50,
    totalBytes: 100,
    downloadedBytes: 50,
    speed: 99,
    peers: 7,
    eta: 12,
    addedAt: 1,
    ...over,
  };
}

describe("reconcileQueue", () => {
  it("drops completed entries, dedupes, and resets live counters", () => {
    const out = reconcileQueue([
      item({ id: "a", status: "completed" }),
      item({ id: "b", status: "paused" }),
      item({ id: "c", status: "failed" }),
      item({ id: "d", status: "downloading" }),
      item({ id: "d", status: "downloading" }),
    ]);

    expect(out.map((i) => i.id)).toEqual(["b", "c", "d"]);
    expect(out.map((i) => i.status)).toEqual(["paused", "failed", "downloading"]);
    for (const it of out) {
      expect(it.speed).toBe(0);
      expect(it.peers).toBe(0);
      expect(it.eta).toBeUndefined();
    }
  });

  it("skips entries without an id", () => {
    const out = reconcileQueue([item({ id: "" }), item({ id: "ok" })]);
    expect(out.map((i) => i.id)).toEqual(["ok"]);
  });
});

import { useEffect } from "react";
import { useStore, useQueueItems } from "../store";

export function TabTitle() {
  const { queue } = useStore();
  useQueueItems(queue);
  const active = queue.activeCount;

  useEffect(() => {
    const title = active > 0 ? `↓${active} · seeddeck` : "seeddeck";
    process.stdout.write(`\x1b]0;${title}\x07`);
    if (process.platform === "win32") process.title = title;
  }, [active]);

  return null;
}

import { useEffect, useMemo, useState } from "react";
import { isDemo } from "@/hooks/use-torrents";
import { api } from "@/lib/api";
import { demoDetails } from "@/lib/demo";
import type { TorrentDetails, TorrentSummary } from "@/lib/types";

/**
 * Details of the focused torrent, refreshed with every stats update
 * (`torrent` is a new object each second).
 */
export function useTorrentDetails(torrent: TorrentSummary | null) {
  const [details, setDetails] = useState<TorrentDetails | null>(null);
  // Demo mode keeps file selections in memory, per torrent.
  const [demoExcluded, setDemoExcluded] = useState<Map<number, Set<number>>>(new Map());

  const id = torrent?.id ?? null;
  useEffect(() => {
    if (isDemo || id == null) return;
    let active = true;
    api.torrentDetails(id).then(
      (d) => active && setDetails(d),
      () => active && setDetails(null),
    );
    return () => {
      active = false;
    };
  }, [id, torrent]);

  const demo = useMemo(
    () =>
      isDemo && torrent ? demoDetails(torrent, demoExcluded.get(torrent.id) ?? new Set()) : null,
    [torrent, demoExcluded],
  );

  async function setFiles(id: number, files: number[]) {
    if (isDemo) {
      const all = demo?.files.map((f) => f.index) ?? [];
      setDemoExcluded((m) => new Map(m).set(id, new Set(all.filter((i) => !files.includes(i)))));
      return;
    }
    await api.setFiles(id, files);
    setDetails(await api.torrentDetails(id));
  }

  const current = isDemo ? demo : details?.id === id ? details : null;
  return { details: current, setFiles };
}

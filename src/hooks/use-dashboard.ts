import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { demoDisk, demoStats, demoTorrents } from "@/lib/demo";
import type { DiskSpace, SessionStats, TorrentSummary } from "@/lib/types";

export const isDemo = !isTauri() || import.meta.env.VITE_DEMO === "1";

interface DashboardData {
  torrents: TorrentSummary[];
  stats: SessionStats | null;
  disk: DiskSpace | null;
}

/**
 * Live torrent data for the UI. Until the engine commands land (M1) the real
 * app shows an empty state; demo mode renders sample data.
 */
export function useDashboard(): DashboardData {
  const [data, setData] = useState<DashboardData>(() =>
    isDemo
      ? { torrents: demoTorrents, stats: demoStats, disk: demoDisk }
      : { torrents: [], stats: null, disk: null },
  );

  useEffect(() => {
    if (!isDemo) return;
    // Jiggle speeds a little so the demo feels alive.
    const timer = setInterval(() => {
      setData((d) => ({
        ...d,
        torrents: d.torrents.map((t) =>
          t.state === "downloading"
            ? {
                ...t,
                progress: Math.min(1, t.progress + 0.0005),
                downloadSpeed: t.downloadSpeed * (0.9 + Math.random() * 0.2),
              }
            : t,
        ),
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return data;
}

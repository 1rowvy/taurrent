import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { demoTorrents } from "@/lib/demo";
import type { SessionStats, SpeedSample, TorrentSummary } from "@/lib/types";

export const isDemo = !isTauri() || import.meta.env.VITE_DEMO === "1";

const HISTORY = 60;

interface TorrentsData {
  torrents: TorrentSummary[];
  stats: SessionStats;
  history: SpeedSample[];
}

function totals(torrents: TorrentSummary[]): SessionStats {
  return torrents.reduce(
    (acc, t) => ({
      downloadSpeed: acc.downloadSpeed + t.downloadSpeed,
      uploadSpeed: acc.uploadSpeed + t.uploadSpeed,
    }),
    { downloadSpeed: 0, uploadSpeed: 0 },
  );
}

const demoBase = new Map<number, { down: number; up: number }>();

/** Eases toward a random target around the torrent's base speed. */
function drift(id: number, kind: "down" | "up", current: number, fallback: number) {
  if (!demoBase.has(id)) demoBase.set(id, { down: 0, up: 0 });
  const base = demoBase.get(id)!;
  if (!base[kind]) base[kind] = fallback;
  const target = base[kind] * (0.7 + Math.random() * 0.6);
  return current + (target - current) * 0.12;
}

/** Demo torrents with jittering speeds and a pre-filled speed history. */
function demoTick(torrents: TorrentSummary[]): TorrentSummary[] {
  return torrents.map((t) => {
    if (t.state === "downloading") {
      const downloadSpeed = Math.max(256 * 1024, drift(t.id, "down", t.downloadSpeed, t.downloadSpeed));
      const downloadedBytes = Math.min(t.totalBytes, t.downloadedBytes + downloadSpeed);
      return {
        ...t,
        downloadSpeed,
        uploadSpeed: drift(t.id, "up", t.uploadSpeed, t.uploadSpeed),
        downloadedBytes,
        progress: downloadedBytes / t.totalBytes,
        eta: (t.totalBytes - downloadedBytes) / downloadSpeed,
        elapsed: t.elapsed + 1,
      };
    }
    if (t.state === "seeding") {
      return { ...t, uploadSpeed: drift(t.id, "up", t.uploadSpeed, t.uploadSpeed), elapsed: t.elapsed + 1 };
    }
    return t;
  });
}

function initial(): TorrentsData {
  if (!isDemo) {
    return { torrents: [], stats: { downloadSpeed: 0, uploadSpeed: 0 }, history: [] };
  }
  let torrents = demoTorrents;
  const history: SpeedSample[] = [];
  for (let i = 0; i < HISTORY; i++) {
    torrents = demoTick(torrents);
    const s = totals(torrents);
    history.push({ down: s.downloadSpeed, up: s.uploadSpeed });
  }
  return { torrents: demoTorrents, stats: totals(demoTorrents), history };
}

/**
 * Live torrent data for the UI. Until the engine commands land (M1) the real
 * app shows an empty state; demo mode renders sample data.
 */
export function useTorrents(): TorrentsData {
  const [data, setData] = useState<TorrentsData>(initial);

  useEffect(() => {
    if (!isDemo) return;
    const timer = setInterval(() => {
      setData((d) => {
        const torrents = demoTick(d.torrents);
        const stats = totals(torrents);
        const history = [...d.history, { down: stats.downloadSpeed, up: stats.uploadSpeed }];
        return { torrents, stats, history: history.slice(-HISTORY) };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return data;
}

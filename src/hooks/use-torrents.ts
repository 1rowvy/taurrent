import { useEffect, useMemo, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { api } from "@/lib/api";
import { demoPreview, demoTorrents } from "@/lib/demo";
import type {
  AddOptions,
  SessionStats,
  SpeedSample,
  TorrentPreview,
  TorrentsSnapshot,
  TorrentSummary,
} from "@/lib/types";

export const isDemo = !isTauri() || import.meta.env.VITE_DEMO === "1";

const HISTORY = 60;

type TorrentsData = TorrentsSnapshot;

export interface TorrentActions {
  addMagnet: (url: string) => Promise<void>;
  addTorrentFile: (path: string) => Promise<void>;
  /** Fetches metadata for the add dialog without adding the torrent. */
  resolveMagnet: (url: string) => Promise<TorrentPreview>;
  resolveTorrentFile: (path: string) => Promise<TorrentPreview>;
  /** Adds a torrent returned by `resolve*`. */
  addResolved: (infoHash: string, options: AddOptions) => Promise<void>;
  /** Drops resolved metadata when the dialog is closed without adding. */
  discardResolved: (infoHash: string) => void;
  pause: (id: number) => Promise<void>;
  resume: (id: number) => Promise<void>;
  remove: (id: number, deleteFiles: boolean) => Promise<void>;
  openFolder: (id: number) => Promise<void>;
  openFile: (id: number, index: number) => Promise<void>;
  revealFile: (id: number, index: number) => Promise<void>;
}

/** Thrown by actions that need the real engine. */
export class DemoModeError extends Error {}

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
      const downloadSpeed = Math.max(
        256 * 1024,
        drift(t.id, "down", t.downloadSpeed, t.downloadSpeed),
      );
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
      return {
        ...t,
        uploadSpeed: drift(t.id, "up", t.uploadSpeed, t.uploadSpeed),
        elapsed: t.elapsed + 1,
      };
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
 * Live torrent data for the UI: the backend pushes a snapshot every second
 * (`torrents:update`); demo mode animates sample data instead.
 */
export function useTorrents(): TorrentsData & { actions: TorrentActions } {
  const [data, setData] = useState<TorrentsData>(initial);

  useEffect(() => {
    if (isDemo) {
      const timer = setInterval(() => {
        setData((d) => {
          const torrents = demoTick(d.torrents);
          const stats = totals(torrents);
          const history = [...d.history, { down: stats.downloadSpeed, up: stats.uploadSpeed }];
          return { torrents, stats, history: history.slice(-HISTORY) };
        });
      }, 1000);
      return () => clearInterval(timer);
    }

    let active = true;
    api.listTorrents().then((s) => active && setData(s));
    const unlisten = listen<TorrentsSnapshot>("torrents:update", (e) => {
      if (active) setData(e.payload);
    });
    return () => {
      active = false;
      unlisten.then((f) => f());
    };
  }, []);

  const actions = useMemo<TorrentActions>(() => {
    if (isDemo) {
      const update = (id: number, change: (t: TorrentSummary) => TorrentSummary | null) =>
        setData((d) => ({
          ...d,
          torrents: d.torrents.flatMap((t) => (t.id === id ? (change(t) ?? []) : [t])),
        }));
      const unsupported = () => Promise.reject(new DemoModeError());
      const preview = () =>
        new Promise<TorrentPreview>((resolve) => setTimeout(() => resolve(demoPreview), 600));
      return {
        addMagnet: unsupported,
        addTorrentFile: unsupported,
        resolveMagnet: preview,
        resolveTorrentFile: preview,
        addResolved: async (_, { onlyFiles, paused }) => {
          const totalBytes = demoPreview.files
            .filter((f) => onlyFiles?.includes(f.index) ?? true)
            .reduce((sum, f) => sum + f.size, 0);
          setData((d) => ({
            ...d,
            torrents: [
              ...d.torrents,
              {
                id: Math.max(0, ...d.torrents.map((t) => t.id)) + 1,
                name: demoPreview.name,
                totalBytes,
                progress: 0,
                state: paused ? "paused" : "downloading",
                error: null,
                downloadSpeed: paused ? 0 : 3 * 1024 ** 2,
                uploadSpeed: 0,
                downloadedBytes: 0,
                uploadedBytes: 0,
                eta: null,
                elapsed: 0,
                seeds: 0,
                peers: 0,
              },
            ],
          }));
        },
        discardResolved: () => {},
        pause: async (id) =>
          update(id, (t) => ({
            ...t,
            state: "paused",
            downloadSpeed: 0,
            uploadSpeed: 0,
            eta: null,
          })),
        resume: async (id) =>
          update(id, (t) => ({ ...t, state: t.progress >= 1 ? "seeding" : "downloading" })),
        remove: async (id) => update(id, () => null),
        openFolder: unsupported,
        openFile: unsupported,
        revealFile: unsupported,
      };
    }

    // Refresh right away instead of waiting for the next tick.
    const refresh = async () => setData(await api.listTorrents());
    return {
      addMagnet: async (url) => {
        await api.addMagnet(url);
        await refresh();
      },
      addTorrentFile: async (path) => {
        await api.addTorrentFile(path);
        await refresh();
      },
      resolveMagnet: api.resolveMagnet,
      resolveTorrentFile: api.resolveTorrentFile,
      addResolved: async (infoHash, options) => {
        await api.addResolved(infoHash, options);
        await refresh();
      },
      discardResolved: (infoHash) => void api.discardResolved(infoHash).catch(() => {}),
      pause: async (id) => {
        await api.pause(id);
        await refresh();
      },
      resume: async (id) => {
        await api.resume(id);
        await refresh();
      },
      remove: async (id, deleteFiles) => {
        await api.remove(id, deleteFiles);
        await refresh();
      },
      openFolder: api.openFolder,
      openFile: api.openFile,
      revealFile: api.revealFile,
    };
  }, []);

  return { ...data, actions };
}

import type { DiskSpace, SessionStats, TorrentSummary } from "@/lib/types";

const GB = 1024 ** 3;
const MB = 1024 ** 2;

/** Sample data used for UI previews in a plain browser or with VITE_DEMO=1. */
export const demoTorrents: TorrentSummary[] = [
  {
    id: 1,
    name: "debian-13.1.0-amd64-DVD-1.iso",
    totalBytes: 3.9 * GB,
    progress: 0.64,
    state: "downloading",
    downloadSpeed: 30.4 * MB,
    uploadSpeed: 2.5 * MB,
    eta: 144,
    peers: 87,
  },
  {
    id: 2,
    name: "Big Buck Bunny 4K 60fps.mp4",
    totalBytes: 1.4 * GB,
    progress: 0.06,
    state: "paused",
    downloadSpeed: 0,
    uploadSpeed: 0,
    eta: null,
    peers: 0,
  },
  {
    id: 3,
    name: "Sintel (2010) 1080p.mkv",
    totalBytes: 2.2 * GB,
    progress: 1,
    state: "seeding",
    downloadSpeed: 0,
    uploadSpeed: 640 * 1024,
    eta: null,
    peers: 12,
  },
  {
    id: 4,
    name: "Blender Open Movie Soundtracks.flac",
    totalBytes: 820 * MB,
    progress: 0.37,
    state: "downloading",
    downloadSpeed: 4.1 * MB,
    uploadSpeed: 310 * 1024,
    eta: 1210,
    peers: 23,
  },
  {
    id: 5,
    name: "archlinux-2026.10.01-x86_64.iso",
    totalBytes: 1.2 * GB,
    progress: 0.92,
    state: "checking",
    downloadSpeed: 0,
    uploadSpeed: 0,
    eta: null,
    peers: 0,
  },
];

export const demoStats: SessionStats = {
  downloadedBytes: 12.34 * GB,
  uploadedBytes: 2.34 * GB,
  downloadSpeed: 34.5 * MB,
  uploadSpeed: 3.4 * MB,
};

export const demoDisk: DiskSpace = { freeBytes: 82 * GB, totalBytes: 512 * GB };

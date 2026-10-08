import type { TorrentDetails, TorrentPreview, TorrentSummary } from "@/lib/types";

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
    error: null,
    downloadSpeed: 11.2 * MB,
    uploadSpeed: 2.5 * MB,
    downloadedBytes: 2.5 * GB,
    uploadedBytes: 410 * MB,
    eta: 135,
    elapsed: 511,
    seeds: 21,
    peers: 8,
  },
  {
    id: 2,
    name: "Blender Open Movie Soundtracks.flac",
    totalBytes: 820 * MB,
    progress: 0.37,
    state: "downloading",
    error: null,
    downloadSpeed: 4.1 * MB,
    uploadSpeed: 310 * 1024,
    downloadedBytes: 303 * MB,
    uploadedBytes: 41 * MB,
    eta: 900,
    elapsed: 300,
    seeds: 54,
    peers: 18,
  },
  {
    id: 3,
    name: "Sintel (2010) 1080p.mkv",
    totalBytes: 2.2 * GB,
    progress: 1,
    state: "seeding",
    error: null,
    downloadSpeed: 0,
    uploadSpeed: 7.6 * MB,
    downloadedBytes: 2.2 * GB,
    uploadedBytes: 3.1 * GB,
    eta: null,
    elapsed: 86_400,
    seeds: 9,
    peers: 2,
  },
  {
    id: 4,
    name: "Big Buck Bunny 4K 60fps.mp4",
    totalBytes: 1.4 * GB,
    progress: 0.81,
    state: "paused",
    error: null,
    downloadSpeed: 0,
    uploadSpeed: 0,
    downloadedBytes: 1.13 * GB,
    uploadedBytes: 96 * MB,
    eta: null,
    elapsed: 4_200,
    seeds: 11,
    peers: 21,
  },
  {
    id: 5,
    name: "Project Gutenberg Top 100.epub",
    totalBytes: 312 * MB,
    progress: 0.42,
    state: "paused",
    error: null,
    downloadSpeed: 0,
    uploadSpeed: 0,
    downloadedBytes: 131 * MB,
    uploadedBytes: 0,
    eta: null,
    elapsed: 960,
    seeds: 11,
    peers: 21,
  },
  {
    id: 6,
    name: "archlinux-2026.10.01-x86_64.iso",
    totalBytes: 1.2 * GB,
    progress: 1,
    state: "paused",
    error: null,
    downloadSpeed: 0,
    uploadSpeed: 0,
    downloadedBytes: 1.2 * GB,
    uploadedBytes: 2.4 * GB,
    eta: null,
    elapsed: 172_800,
    seeds: 0,
    peers: 0,
  },
];

/** Metadata the add dialog shows in demo mode, whatever the source. */
export const demoPreview: TorrentPreview = {
  infoHash: "c9e15763f722f23e98a29decdfae341b98d53056",
  name: "Cosmos Laundromat (2015)",
  totalBytes: 0,
  alreadyAdded: false,
  files: [
    { path: ["cosmos-laundromat-1080p.mkv"], size: 1.6 * GB },
    { path: ["cosmos-laundromat-4k.mkv"], size: 6.3 * GB },
    { path: ["Subtitles", "en.srt"], size: 24 * 1024 },
    { path: ["Subtitles", "ru.srt"], size: 27 * 1024 },
    { path: ["poster.jpg"], size: 1.2 * MB },
    { path: ["README.txt"], size: 2 * 1024 },
  ].map((f, index) => ({ ...f, index })),
};
demoPreview.totalBytes = demoPreview.files.reduce((sum, f) => sum + f.size, 0);

const DEMO_CLIENTS = [
  "qBittorrent 5.1.2",
  "Transmission 4.0.6",
  "rqbit 9.0.1",
  "Deluge 2.2.0",
  null,
];

/** Files, peers and trackers made up from a demo torrent's summary. */
export function demoDetails(t: TorrentSummary, excluded: ReadonlySet<number>): TorrentDetails {
  const files =
    t.name === demoPreview.name
      ? demoPreview.files
      : [{ index: 0, path: [t.name], size: t.totalBytes }];
  const live = t.state === "downloading" || t.state === "seeding";
  return {
    id: t.id,
    infoHash: (t.id * 0x9e3779b1).toString(16).padStart(8, "0").repeat(5),
    outputFolder: `~/Downloads/${files.length > 1 ? t.name : ""}`,
    pieceLength: 4 * MB,
    pieceCount: Math.ceil(t.totalBytes / (4 * MB)),
    files: files.map((f) => ({
      ...f,
      downloaded: f.size * t.progress,
      included: !excluded.has(f.index),
    })),
    peers: live
      ? Array.from({ length: Math.min(t.seeds, 12) }, (_, i) => ({
          address: `${(t.id * 37 + i * 11) % 223}.${(i * 53) % 255}.${(t.id * 7) % 255}.${(i * 29 + 3) % 255}:${6881 + i}`,
          client: DEMO_CLIENTS[i % DEMO_CLIENTS.length],
          connection: i % 3 === 0 ? ("utp" as const) : ("tcp" as const),
          downloaded: (t.downloadedBytes / (i + 2)) * 0.6,
          uploaded: (t.uploadedBytes / (i + 3)) * 0.5,
        }))
      : [],
    trackers: ["udp://tracker.opentrackr.org:1337/announce", "udp://open.stealth.si:80/announce"],
  };
}

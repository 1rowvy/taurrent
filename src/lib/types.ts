export type TorrentState = "downloading" | "seeding" | "paused" | "checking" | "error";

export interface TorrentSummary {
  id: number;
  name: string;
  totalBytes: number;
  progress: number; // 0..1
  state: TorrentState;
  error: string | null;
  downloadSpeed: number; // bytes/s
  uploadSpeed: number; // bytes/s
  downloadedBytes: number;
  uploadedBytes: number;
  eta: number | null; // seconds
  elapsed: number; // seconds since added
  seeds: number;
  peers: number;
}

export interface SessionStats {
  downloadSpeed: number;
  uploadSpeed: number;
}

export interface SpeedSample {
  down: number;
  up: number;
}

/** Payload of the backend's `torrents:update` event and `list_torrents`. */
export interface TorrentsSnapshot {
  torrents: TorrentSummary[];
  stats: SessionStats;
  history: SpeedSample[];
}

/** Metadata shown in the add dialog before the torrent is added. */
export interface TorrentPreview {
  infoHash: string;
  name: string;
  totalBytes: number;
  files: PreviewFile[];
  /** The session already has this torrent. */
  alreadyAdded: boolean;
}

export interface PreviewFile {
  /** Index passed back in `AddOptions.onlyFiles`. */
  index: number;
  /** Path components inside the torrent. */
  path: string[];
  size: number;
}

/** What the user picked in the add dialog. */
export interface AddOptions {
  downloadDir: string;
  /** File indices to download; `null` downloads everything. */
  onlyFiles: number[] | null;
  paused: boolean;
}

/** Files, peers and trackers of one torrent, for the details panel. */
export interface TorrentDetails {
  id: number;
  infoHash: string;
  /** Folder the torrent's files are written to. */
  outputFolder: string;
  pieceLength: number;
  pieceCount: number;
  files: TorrentFile[];
  peers: PeerInfo[];
  trackers: string[];
}

export interface TorrentFile {
  index: number;
  path: string[];
  size: number;
  downloaded: number;
  /** Selected for download. */
  included: boolean;
}

export interface PeerInfo {
  address: string;
  client: string | null;
  connection: "tcp" | "utp" | "socks" | null;
  downloaded: number;
  uploaded: number;
}

/** A torrent handed to the app from outside (file association, `magnet:` link). */
export type OpenRequest = { kind: "magnet"; url: string } | { kind: "file"; path: string };

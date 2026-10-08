export type TorrentState =
  | "downloading"
  | "seeding"
  | "paused"
  | "checking"
  | "error";

export interface TorrentSummary {
  id: number;
  name: string;
  totalBytes: number;
  progress: number; // 0..1
  state: TorrentState;
  downloadSpeed: number; // bytes/s
  uploadSpeed: number; // bytes/s
  eta: number | null; // seconds
  peers: number;
}

export interface SessionStats {
  downloadedBytes: number;
  uploadedBytes: number;
  downloadSpeed: number;
  uploadSpeed: number;
}

export interface DiskSpace {
  freeBytes: number;
  totalBytes: number;
}

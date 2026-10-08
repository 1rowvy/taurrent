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

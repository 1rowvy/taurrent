import { invoke } from "@tauri-apps/api/core";
import type {
  AddOptions,
  OpenRequest,
  TorrentDetails,
  TorrentPreview,
  TorrentsSnapshot,
} from "@/lib/types";

export interface EngineStatus {
  version: string;
  listenPort: number | null;
  torrentCount: number;
}

export interface Settings {
  downloadDir: string;
  notifications: boolean;
  autoUpdate: boolean;
  /** `null` follows the system language. */
  language: string | null;
  /** Closing the window hides it to the tray. */
  closeToTray: boolean;
  /** Applied on the next start. */
  connection: ConnectionSettings;
  /** Applied right away. */
  limits: SpeedLimits;
}

export interface ConnectionSettings {
  listenPort: number;
  upnp: boolean;
  dht: boolean;
  /** Max peers per torrent, `0` for the default. */
  peerLimit: number;
}

/** KiB/s, `0` for unlimited. */
export interface SpeedLimits {
  download: number;
  upload: number;
}

export interface TrayLabels {
  show: string;
  pauseAll: string;
  resumeAll: string;
  quit: string;
}

export const api = {
  engineStatus: () => invoke<EngineStatus>("engine_status"),
  listTorrents: () => invoke<TorrentsSnapshot>("list_torrents"),
  addMagnet: (url: string) => invoke<number>("add_magnet", { url }),
  addTorrentFile: (path: string) => invoke<number>("add_torrent_file", { path }),
  resolveMagnet: (url: string) => invoke<TorrentPreview>("resolve_magnet", { url }),
  resolveTorrentFile: (path: string) => invoke<TorrentPreview>("resolve_torrent_file", { path }),
  addResolved: (infoHash: string, options: AddOptions) =>
    invoke<number>("add_resolved", { infoHash, options }),
  discardResolved: (infoHash: string) => invoke<void>("discard_resolved", { infoHash }),
  pause: (id: number) => invoke<void>("pause", { id }),
  resume: (id: number) => invoke<void>("resume", { id }),
  remove: (id: number, deleteFiles: boolean) => invoke<void>("remove", { id, deleteFiles }),
  torrentDetails: (id: number) => invoke<TorrentDetails>("torrent_details", { id }),
  setFiles: (id: number, files: number[]) => invoke<void>("set_files", { id, files }),
  openFolder: (id: number) => invoke<void>("open_folder", { id }),
  openFile: (id: number, index: number) => invoke<void>("open_file", { id, index }),
  revealFile: (id: number, index: number) => invoke<void>("reveal_file", { id, index }),
  takeOpenRequests: () => invoke<OpenRequest[]>("take_open_requests"),
  setTrayLabels: (labels: TrayLabels) => invoke<void>("set_tray_labels", { labels }),
  getSettings: () => invoke<Settings>("get_settings"),
  setDownloadDir: (path: string) => invoke<Settings>("set_download_dir", { path }),
  setNotifications: (enabled: boolean) => invoke<Settings>("set_notifications", { enabled }),
  setAutoUpdate: (enabled: boolean) => invoke<Settings>("set_auto_update", { enabled }),
  setLanguage: (language: string | null) => invoke<Settings>("set_language", { language }),
  setCloseToTray: (enabled: boolean) => invoke<Settings>("set_close_to_tray", { enabled }),
  setConnection: (connection: ConnectionSettings) =>
    invoke<Settings>("set_connection", { connection }),
  setLimits: (limits: SpeedLimits) => invoke<Settings>("set_limits", { limits }),
};

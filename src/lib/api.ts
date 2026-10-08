import { invoke } from "@tauri-apps/api/core";

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
}

export const api = {
  engineStatus: () => invoke<EngineStatus>("engine_status"),
  getSettings: () => invoke<Settings>("get_settings"),
  setDownloadDir: (path: string) => invoke<Settings>("set_download_dir", { path }),
  setNotifications: (enabled: boolean) => invoke<Settings>("set_notifications", { enabled }),
  setAutoUpdate: (enabled: boolean) => invoke<Settings>("set_auto_update", { enabled }),
  setLanguage: (language: string | null) => invoke<Settings>("set_language", { language }),
};

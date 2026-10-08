import { invoke } from "@tauri-apps/api/core";

export interface EngineStatus {
  version: string;
  listenPort: number | null;
  torrentCount: number;
}

export interface Settings {
  downloadDir: string;
}

export const api = {
  engineStatus: () => invoke<EngineStatus>("engine_status"),
  getSettings: () => invoke<Settings>("get_settings"),
  setDownloadDir: (path: string) => invoke<Settings>("set_download_dir", { path }),
};

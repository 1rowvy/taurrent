import { invoke } from "@tauri-apps/api/core";

export interface EngineStatus {
  version: string;
  listenPort: number | null;
  torrentCount: number;
}

export const api = {
  engineStatus: () => invoke<EngineStatus>("engine_status"),
};

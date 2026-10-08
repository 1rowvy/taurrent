import { useCallback, useEffect, useState } from "react";
import { api, type ConnectionSettings, type Settings, type SpeedLimits } from "@/lib/api";
import { isDemo } from "@/hooks/use-torrents";

const DEMO_SETTINGS: Settings = {
  downloadDir: "~/Downloads",
  notifications: true,
  autoUpdate: true,
  language: null,
  closeToTray: true,
  connection: { listenPort: 51413, upnp: true, dht: true, peerLimit: 0 },
  limits: { download: 0, upload: 0 },
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(isDemo ? DEMO_SETTINGS : null);
  const [error, setError] = useState<string | null>(null);
  // What the engine was started with; connection changes need a restart.
  const [startConnection, setStartConnection] = useState<ConnectionSettings | null>(
    isDemo ? DEMO_SETTINGS.connection : null,
  );

  useEffect(() => {
    if (isDemo) return;
    api.getSettings().then(
      (s) => {
        setSettings(s);
        setStartConnection(s.connection);
      },
      (e) => setError(String(e)),
    );
  }, []);

  const restartNeeded =
    settings != null &&
    startConnection != null &&
    (Object.keys(startConnection) as (keyof ConnectionSettings)[]).some(
      (k) => settings.connection[k] !== startConnection[k],
    );

  const run = useCallback(async (change: () => Promise<Settings>, fallback: Partial<Settings>) => {
    if (isDemo) {
      setSettings((s) => (s ? { ...s, ...fallback } : s));
      return;
    }
    try {
      setSettings(await change());
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  return {
    settings,
    error,
    restartNeeded,
    setDownloadDir: (path: string) => run(() => api.setDownloadDir(path), { downloadDir: path }),
    setNotifications: (enabled: boolean) =>
      run(() => api.setNotifications(enabled), { notifications: enabled }),
    setAutoUpdate: (enabled: boolean) =>
      run(() => api.setAutoUpdate(enabled), { autoUpdate: enabled }),
    setLanguage: (language: string | null) => run(() => api.setLanguage(language), { language }),
    setCloseToTray: (enabled: boolean) =>
      run(() => api.setCloseToTray(enabled), { closeToTray: enabled }),
    setConnection: (connection: ConnectionSettings) =>
      run(() => api.setConnection(connection), { connection }),
    setLimits: (limits: SpeedLimits) => run(() => api.setLimits(limits), { limits }),
  };
}

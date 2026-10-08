import { useCallback, useEffect, useState } from "react";
import { api, type Settings } from "@/lib/api";
import { isDemo } from "@/hooks/use-torrents";

const DEMO_SETTINGS: Settings = { downloadDir: "~/Downloads", notifications: true, autoUpdate: true, language: null };

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(isDemo ? DEMO_SETTINGS : null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isDemo) return;
    api.getSettings().then(setSettings, (e) => setError(String(e)));
  }, []);

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
    setDownloadDir: (path: string) => run(() => api.setDownloadDir(path), { downloadDir: path }),
    setNotifications: (enabled: boolean) =>
      run(() => api.setNotifications(enabled), { notifications: enabled }),
    setAutoUpdate: (enabled: boolean) =>
      run(() => api.setAutoUpdate(enabled), { autoUpdate: enabled }),
    setLanguage: (language: string | null) =>
      run(() => api.setLanguage(language), { language }),
  };
}

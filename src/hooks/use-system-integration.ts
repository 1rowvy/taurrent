import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { useTranslation } from "react-i18next";
import { isDemo } from "@/hooks/use-torrents";
import { api } from "@/lib/api";
import type { OpenRequest } from "@/lib/types";

/**
 * Wires the UI to the OS-facing backend pieces: torrents opened from outside
 * (file association, `magnet:` links, a second launch), the tray menu's
 * language, and "download complete" notifications.
 */
export function useSystemIntegration({
  onOpenRequests,
  notifications,
}: {
  onOpenRequests: (requests: OpenRequest[]) => void;
  notifications: boolean | undefined;
}) {
  const { t, i18n } = useTranslation();
  const onOpenRef = useRef(onOpenRequests);
  onOpenRef.current = onOpenRequests;
  const notifyRef = useRef({ enabled: notifications, title: t("notify.completed") });
  notifyRef.current = { enabled: notifications, title: t("notify.completed") };

  useEffect(() => {
    if (isDemo) return;
    let active = true;
    const take = () =>
      api.takeOpenRequests().then((r) => active && r.length > 0 && onOpenRef.current(r));
    take();
    const unlistenOpen = listen("open:requested", take);
    const unlistenDone = listen<string>("torrent:completed", async ({ payload: name }) => {
      const { enabled, title } = notifyRef.current;
      if (!enabled) return;
      const granted = (await isPermissionGranted()) || (await requestPermission()) === "granted";
      if (granted) sendNotification({ title, body: name });
    });
    return () => {
      active = false;
      unlistenOpen.then((f) => f());
      unlistenDone.then((f) => f());
    };
  }, []);

  useEffect(() => {
    if (isDemo) return;
    api
      .setTrayLabels({
        show: t("tray.show"),
        pauseAll: t("tray.pauseAll"),
        resumeAll: t("tray.resumeAll"),
        quit: t("tray.quit"),
      })
      .catch(() => {}); // No tray on this desktop.
  }, [t, i18n.language]);
}

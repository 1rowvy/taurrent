import { useCallback, useEffect, useRef, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { isDemo } from "@/hooks/use-torrents";

export type UpdaterState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "upToDate" }
  | { status: "available"; version: string }
  | { status: "downloading"; version: string; progress: number | null }
  | { status: "error"; message: string };

/**
 * Checks GitHub Releases for a signed update (see plugins.updater in
 * tauri.conf.json). Installing is always user-initiated so active downloads
 * are not cut off by a restart.
 */
export function useUpdater(autoCheck: boolean | undefined) {
  const [state, setState] = useState<UpdaterState>({ status: "idle" });
  const [version, setVersion] = useState<string | null>(null);
  const update = useRef<Update | null>(null);
  const autoChecked = useRef(false);

  useEffect(() => {
    if (isDemo) return;
    getVersion().then(setVersion);
  }, []);

  const checkNow = useCallback(async () => {
    if (isDemo) {
      setState({ status: "upToDate" });
      return;
    }
    setState({ status: "checking" });
    try {
      update.current = await check();
      setState(
        update.current
          ? { status: "available", version: update.current.version }
          : { status: "upToDate" },
      );
    } catch (e) {
      setState({ status: "error", message: String(e) });
    }
  }, []);

  useEffect(() => {
    if (autoCheck && !autoChecked.current) {
      autoChecked.current = true;
      checkNow();
    }
  }, [autoCheck, checkNow]);

  const install = useCallback(async () => {
    const u = update.current;
    if (!u) return;
    let total = 0;
    let received = 0;
    setState({ status: "downloading", version: u.version, progress: null });
    try {
      await u.downloadAndInstall((event) => {
        if (event.event === "Started") total = event.data.contentLength ?? 0;
        if (event.event === "Progress") {
          received += event.data.chunkLength;
          setState({
            status: "downloading",
            version: u.version,
            progress: total ? received / total : null,
          });
        }
      });
      await relaunch();
    } catch (e) {
      setState({ status: "error", message: String(e) });
    }
  }, []);

  return { state, version, checkNow, install };
}

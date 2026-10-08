import { useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";

const isTorrent = (path: string) => path.toLowerCase().endsWith(".torrent");

/**
 * Follows files dragged onto the window from the OS. Returns whether
 * `.torrent` files are being dragged over it; `onDrop` gets the dropped ones.
 */
export function useTorrentDrop(onDrop: (paths: string[]) => void): boolean {
  const [dragging, setDragging] = useState(false);
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  useEffect(() => {
    if (!isTauri()) return;
    const unlisten = getCurrentWebview().onDragDropEvent(({ payload }) => {
      switch (payload.type) {
        case "enter":
          setDragging(payload.paths.some(isTorrent));
          break;
        case "leave":
          setDragging(false);
          break;
        case "drop": {
          setDragging(false);
          const paths = payload.paths.filter(isTorrent);
          if (paths.length > 0) onDropRef.current(paths);
          break;
        }
      }
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  return dragging;
}

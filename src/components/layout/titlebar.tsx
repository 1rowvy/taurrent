import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Copy, Minus, Square, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/brand/logo";

const appWindow = isTauri() ? getCurrentWindow() : null;

export function Titlebar() {
  return (
    <header
      data-tauri-drag-region
      className="flex h-11 shrink-0 items-center pl-5 text-sm"
    >
      <Logo className="pointer-events-none text-[0.95rem] [&_svg]:text-primary" />
      <span className="pointer-events-none ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] font-semibold text-muted-foreground tabular-nums">
        v{__APP_VERSION__}
      </span>

      <div data-tauri-drag-region className="h-full flex-1" />

      {appWindow && <WindowControls />}
    </header>
  );
}

function WindowControls() {
  const { t } = useTranslation();
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!appWindow) return;
    appWindow.isMaximized().then(setMaximized);
    const unlisten = appWindow.onResized(() => {
      appWindow.isMaximized().then(setMaximized);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const btn =
    "grid h-full w-11 place-items-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

  return (
    <div className="flex h-full">
      <button className={btn} onClick={() => appWindow?.minimize()} aria-label={t("titlebar.minimize")}>
        <Minus className="size-4" />
      </button>
      <button className={btn} onClick={() => appWindow?.toggleMaximize()} aria-label={t("titlebar.maximize")}>
        {maximized ? <Copy className="size-3.5 -scale-x-100" /> : <Square className="size-3.5" />}
      </button>
      <button
        className={`${btn} hover:bg-destructive hover:text-white`}
        onClick={() => appWindow?.close()}
        aria-label={t("titlebar.close")}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

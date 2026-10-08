import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ChevronDown, Copy, Minus, Square, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const appWindow = isTauri() ? getCurrentWindow() : null;

export function Titlebar() {
  return (
    <header
      data-tauri-drag-region
      className="flex h-11 shrink-0 items-center gap-6 pl-5 text-sm"
    >
      <Logo className="pointer-events-none text-[0.95rem] [&_svg]:text-primary" />

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">
          Options <ChevronDown className="size-3.5" />
        </DropdownMenuTrigger>
        {/* Wired up in M1 together with the engine commands. */}
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuItem disabled>Add torrent file…</DropdownMenuItem>
          <DropdownMenuItem disabled>Add magnet link…</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>Resume all</DropdownMenuItem>
          <DropdownMenuItem disabled>Pause all</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div data-tauri-drag-region className="h-full flex-1" />

      {appWindow && <WindowControls />}
    </header>
  );
}

function WindowControls() {
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
      <button className={btn} onClick={() => appWindow?.minimize()} aria-label="Minimize">
        <Minus className="size-4" />
      </button>
      <button className={btn} onClick={() => appWindow?.toggleMaximize()} aria-label="Maximize">
        {maximized ? <Copy className="size-3.5 -scale-x-100" /> : <Square className="size-3.5" />}
      </button>
      <button
        className={`${btn} hover:bg-destructive hover:text-white`}
        onClick={() => appWindow?.close()}
        aria-label="Close"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

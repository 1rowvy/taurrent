import type { LucideIcon } from "lucide-react";
import { LayoutGrid, ListTree, Moon, Settings2, Sun } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

export type View = "dashboard" | "torrents" | "settings";

const NAV: { view: View; label: string; icon: LucideIcon }[] = [
  { view: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { view: "torrents", label: "Torrents", icon: ListTree },
  { view: "settings", label: "Settings", icon: Settings2 },
];

interface SidebarProps {
  view: View;
  onViewChange: (view: View) => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export function Sidebar({ view, onViewChange, theme, onToggleTheme }: SidebarProps) {
  return (
    <aside className="flex w-22 shrink-0 flex-col items-center py-5">
      <LogoMark className="size-9 text-primary" />

      <nav className="mt-auto mb-auto flex flex-col gap-2">
        {NAV.map(({ view: v, label, icon: Icon }) => (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            className={cn(
              "flex w-16 flex-col items-center gap-1.5 rounded-2xl py-3 text-muted-foreground transition-colors hover:text-foreground",
              v === view && "bg-card text-foreground",
            )}
          >
            <Icon className={cn("size-5", v === view && "text-primary")} />
            <span className="text-[0.6rem] font-bold tracking-wider uppercase">{label}</span>
          </button>
        ))}
      </nav>

      <button
        onClick={onToggleTheme}
        className="rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <Moon className="size-5" /> : <Sun className="size-5" />}
      </button>
    </aside>
  );
}

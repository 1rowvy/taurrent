import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { formatSpeed } from "@/lib/format";
import type { SessionStats } from "@/lib/types";

interface TopbarProps {
  query: string;
  onQueryChange: (query: string) => void;
  stats: SessionStats | null;
}

export function Topbar({ query, onQueryChange, stats }: TopbarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 pr-6">
      <label className="flex flex-1 items-center gap-3 text-muted-foreground">
        <Search className="size-5 text-foreground" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search torrents"
          className="w-full bg-transparent text-xs font-bold tracking-wider text-foreground uppercase outline-none placeholder:text-muted-foreground"
        />
      </label>

      <div className="flex items-center gap-4 text-xs font-semibold tabular-nums">
        <span className="flex items-center gap-1.5">
          <ArrowDown className="size-3.5 text-info" />
          {formatSpeed(stats?.downloadSpeed ?? 0)}
        </span>
        <span className="flex items-center gap-1.5">
          <ArrowUp className="size-3.5 text-success" />
          {formatSpeed(stats?.uploadSpeed ?? 0)}
        </span>
      </div>
    </header>
  );
}

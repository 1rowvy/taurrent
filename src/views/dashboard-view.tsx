import { CloudDownload, CloudUpload, HardDrive } from "lucide-react";
import { DropZone } from "@/components/dashboard/drop-zone";
import { StatTile } from "@/components/dashboard/stat-tile";
import { TorrentList } from "@/components/torrents/torrent-list";
import { formatBytes } from "@/lib/format";
import type { DiskSpace, SessionStats, TorrentSummary } from "@/lib/types";

interface DashboardViewProps {
  torrents: TorrentSummary[];
  stats: SessionStats | null;
  disk: DiskSpace | null;
  onSeeAll: () => void;
}

export function DashboardView({ torrents, stats, disk, onSeeAll }: DashboardViewProps) {
  const used = disk ? disk.totalBytes - disk.freeBytes : 0;

  return (
    <div className="flex flex-col gap-8">
      <section className="grid grid-cols-4 gap-4">
        <StatTile
          tone="mint"
          icon={CloudUpload}
          value={formatBytes(stats?.uploadedBytes ?? 0, 2)}
          caption="Uploaded"
        />
        <StatTile
          tone="sky"
          icon={CloudDownload}
          value={formatBytes(stats?.downloadedBytes ?? 0, 2)}
          caption="Downloaded"
        />
        <StatTile
          tone="lilac"
          icon={HardDrive}
          value={disk ? formatBytes(disk.freeBytes, 1) : "—"}
          caption={disk ? `Free of ${formatBytes(disk.totalBytes, 0)}` : "Disk space"}
          ratio={disk ? used / disk.totalBytes : undefined}
        />
        <DropZone />
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-base font-bold">Recent torrents</h2>
          <button
            onClick={onSeeAll}
            className="text-[0.6rem] font-bold tracking-wider text-primary uppercase hover:underline"
          >
            See all torrents
          </button>
        </div>
        <TorrentList torrents={torrents.slice(0, 3)} />
      </section>
    </div>
  );
}

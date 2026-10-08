import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DropZone({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-foreground/15 bg-muted/60 p-5 text-center">
      <span className="grid size-10 place-items-center rounded-xl bg-foreground text-background">
        <FileDown className="size-5" />
      </span>
      <div className="text-[0.6rem] font-bold tracking-wider text-muted-foreground uppercase">
        .torrent or magnet link
      </div>
      <div className="text-sm leading-tight font-bold">
        Drag &amp; drop torrent
        <br />
        files here or
      </div>
      <Button size="sm" className="mt-1 w-full max-w-36 rounded-full" onClick={onBrowse}>
        Browse
      </Button>
    </div>
  );
}

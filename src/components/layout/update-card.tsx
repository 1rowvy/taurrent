import { CircleArrowUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { UpdaterState } from "@/hooks/use-updater";

interface UpdateCardProps {
  state: UpdaterState;
  onInstall: () => void;
}

/** Sidebar notice shown once an update has been found. */
export function UpdateCard({ state, onInstall }: UpdateCardProps) {
  const { t } = useTranslation();
  if (state.status !== "available" && state.status !== "downloading") return null;

  const downloading = state.status === "downloading";
  const progress = downloading ? state.progress : null;

  return (
    <div className="mx-1 rounded-xl border border-primary/25 bg-primary/10 p-3">
      <div className="flex items-center gap-2 text-[0.8rem] font-bold">
        <CircleArrowUp className="size-4 text-primary" />
        {t("updates.available", { version: state.version })}
      </div>

      {downloading ? (
        <div className="mt-3">
          <div className="text-[0.7rem] font-semibold text-muted-foreground">
            {t("updates.downloading")}
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-foreground/10">
            <div
              className={
                progress == null
                  ? "h-full w-1/3 animate-pulse rounded-full bg-primary"
                  : "h-full rounded-full bg-primary transition-[width]"
              }
              style={progress == null ? undefined : { width: `${progress * 100}%` }}
            />
          </div>
        </div>
      ) : (
        <Button size="sm" className="mt-3 w-full" onClick={onInstall}>
          {t("updates.install")}
        </Button>
      )}
    </div>
  );
}

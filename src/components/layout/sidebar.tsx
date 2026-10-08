import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp, Bell, CircleCheck, LayoutGrid, Moon, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export type StatusFilter = "all" | "downloading" | "seeding" | "completed";

export type Selection =
  | { kind: "status"; status: StatusFilter }
  | { kind: "settings" };

const STATUSES: { id: StatusFilter; icon: LucideIcon }[] = [
  { id: "all", icon: LayoutGrid },
  { id: "downloading", icon: ArrowDown },
  { id: "seeding", icon: ArrowUp },
  { id: "completed", icon: CircleCheck },
];

interface SidebarProps {
  selection: Selection;
  onSelect: (selection: Selection) => void;
  counts: Record<StatusFilter, number>;
  dark: boolean;
  onDarkChange: (dark: boolean) => void;
  notifications: boolean | undefined;
  onNotificationsChange: (enabled: boolean) => void;
}

export function Sidebar({
  selection,
  onSelect,
  counts,
  dark,
  onDarkChange,
  notifications,
  onNotificationsChange,
}: SidebarProps) {
  const { t } = useTranslation();

  return (
    <aside className="flex w-56 shrink-0 flex-col gap-7 overflow-y-auto px-3 pt-4 pb-5">
      <Section title={t("sidebar.overview")}>
        {STATUSES.map((s) => (
          <Item
            key={s.id}
            icon={s.icon}
            label={t(`sidebar.${s.id}`)}
            active={selection.kind === "status" && selection.status === s.id}
            onClick={() => onSelect({ kind: "status", status: s.id })}
            badge={counts[s.id]}
          />
        ))}
      </Section>


      <Section title={t("sidebar.settings")} className="mt-auto">
        <Item
          icon={Settings2}
          label={t("sidebar.settings")}
          active={selection.kind === "settings"}
          onClick={() => onSelect({ kind: "settings" })}
        />
        <ToggleItem
          icon={Bell}
          label={t("sidebar.notifications")}
          checked={notifications ?? false}
          disabled={notifications === undefined}
          onChange={onNotificationsChange}
        />
        <ToggleItem
          icon={Moon}
          label={t("sidebar.darkTheme")}
          checked={dark}
          onChange={onDarkChange}
        />
      </Section>
    </aside>
  );
}

function Section({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("flex flex-col gap-0.5", className)}>
      <h3 className="mb-1.5 px-3 text-[0.6rem] font-bold tracking-[0.14em] text-muted-foreground/70 uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

const itemBase = "flex h-9 items-center gap-3 rounded-lg px-3 text-[0.8rem] font-semibold";

function Item({
  icon: Icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        itemBase,
        "text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
        active && "bg-muted text-foreground",
      )}
    >
      <Icon className={cn("size-4", active && "text-primary")} />
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && (
        <span
          className={cn(
            "min-w-6 rounded-md bg-muted px-1.5 py-0.5 text-center text-[0.65rem] font-bold tabular-nums",
            active && "bg-primary text-primary-foreground",
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function ToggleItem({
  icon: Icon,
  label,
  checked,
  disabled,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={cn(itemBase, "cursor-pointer text-muted-foreground hover:text-foreground")}>
      <Icon className="size-4" />
      <span className="flex-1">{label}</span>
      <Switch size="sm" checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </label>
  );
}

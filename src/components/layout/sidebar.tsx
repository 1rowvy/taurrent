import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp, Bell, CircleCheck, LayoutGrid, Moon, Settings2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { CATEGORIES, type Category } from "@/lib/categories";
import { cn } from "@/lib/utils";

export type StatusFilter = "all" | "downloading" | "seeding" | "completed";

export type Selection =
  | { kind: "status"; status: StatusFilter }
  | { kind: "category"; category: Category }
  | { kind: "settings" };

const STATUSES: { id: StatusFilter; label: string; icon: LucideIcon }[] = [
  { id: "all", label: "Overview", icon: LayoutGrid },
  { id: "downloading", label: "Downloading", icon: ArrowDown },
  { id: "seeding", label: "Seeding", icon: ArrowUp },
  { id: "completed", label: "Completed", icon: CircleCheck },
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
  return (
    <aside className="flex w-56 shrink-0 flex-col gap-7 overflow-y-auto px-3 pt-4 pb-5">
      <Section title="Overview">
        {STATUSES.map((s) => (
          <Item
            key={s.id}
            icon={s.icon}
            label={s.label}
            active={selection.kind === "status" && selection.status === s.id}
            onClick={() => onSelect({ kind: "status", status: s.id })}
            badge={counts[s.id]}
          />
        ))}
      </Section>

      <Section title="Explorer">
        {CATEGORIES.map((c) => (
          <Item
            key={c.id}
            icon={c.icon}
            label={c.label}
            active={selection.kind === "category" && selection.category === c.id}
            onClick={() => onSelect({ kind: "category", category: c.id })}
          />
        ))}
      </Section>

      <Section title="Settings" className="mt-auto">
        <Item
          icon={Settings2}
          label="Settings"
          active={selection.kind === "settings"}
          onClick={() => onSelect({ kind: "settings" })}
        />
        <ToggleItem
          icon={Bell}
          label="Notifications"
          checked={notifications ?? false}
          disabled={notifications === undefined}
          onChange={onNotificationsChange}
        />
        <ToggleItem icon={Moon} label="Dark theme" checked={dark} onChange={onDarkChange} />
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

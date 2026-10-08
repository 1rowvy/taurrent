import { cn } from "@/lib/utils";

/** Taurrent mark: a slanted "T" bar over a download arrow. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-8", className)} aria-hidden>
      <g fill="currentColor" stroke="currentColor" strokeWidth={4} strokeLinejoin="round">
        <path d="M14 7H57L51 22H8Z" />
        <path d="M26 26H40V34H50L33 57L16 34H26Z" />
      </g>
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className="size-[1.1em]" />
      <span className="font-bold tracking-[-0.04em]">taurrent</span>
    </span>
  );
}

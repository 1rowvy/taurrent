import i18n from "@/i18n";

function number(value: number, digits: number): string {
  return new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatBytes(bytes: number, digits = 1): string {
  const units = i18n.t("units.bytes", { returnObjects: true }) as string[];
  if (bytes <= 0) return `0 ${units[0]}`;
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${number(bytes / 1024 ** i, i === 0 ? 0 : digits)} ${units[i]}`;
}

export function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}${i18n.t("units.perSecond")}`;
}

export function formatEta(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds)) return "∞";
  const u = (k: "s" | "m" | "h" | "d") => i18n.t(`units.${k}`);
  if (seconds < 60) return `${Math.round(seconds)}${u("s")}`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}${u("m")} ${Math.round(seconds % 60)}${u("s")}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}${u("h")} ${m % 60}${u("m")}`;
  return `${Math.floor(h / 24)}${u("d")} ${h % 24}${u("h")}`;
}

export function formatRatio(value: number): string {
  return number(value, 2);
}

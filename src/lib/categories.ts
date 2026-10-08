import type { LucideIcon } from "lucide-react";
import { FileText, Film, Music, Shapes } from "lucide-react";
import { fileExtension } from "@/lib/format";

export type Category = "videos" | "music" | "documents" | "other";

export const CATEGORIES: { id: Category; label: string; icon: LucideIcon }[] = [
  { id: "videos", label: "Videos", icon: Film },
  { id: "music", label: "Music", icon: Music },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "other", label: "Other", icon: Shapes },
];

const BY_EXTENSION: Record<string, Category> = Object.fromEntries([
  ...["mkv", "mp4", "avi", "mov", "webm", "m4v"].map((e) => [e, "videos"]),
  ...["mp3", "flac", "wav", "ogg", "m4a", "opus"].map((e) => [e, "music"]),
  ...["pdf", "epub", "djvu", "doc", "docx", "txt", "fb2"].map((e) => [e, "documents"]),
]);

export function categoryOf(name: string): Category {
  return BY_EXTENSION[fileExtension(name)] ?? "other";
}

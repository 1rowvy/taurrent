# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Taurrent is a desktop BitTorrent client: Tauri 2 shell, Rust backend on [librqbit](https://github.com/ikatson/rqbit), React 19 + TypeScript + Vite frontend. Targets Linux and Windows. The user communicates in Russian.

The feature plan and milestone status live in `docs/ROADMAP.md` — check it before starting a feature and tick items off when done.

## Commands

```sh
npm install
npm run tauri dev                 # run the app (Vite on :1420 + Rust)
VITE_DEMO=1 npm run tauri dev     # run the app with sample torrent data
npm run dev                       # frontend only in a browser — demo data is used automatically
npm run build                     # tsc typecheck + vite build (this is the frontend "lint")
npm run tauri build               # release bundles -> src-tauri/target/release/bundle

# Rust (run from repo root)
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml [test_name]
```

CI (`.github/workflows/ci.yml`) runs exactly: `npm run build`, `cargo fmt --check`, `cargo clippy -D warnings`, `cargo test`, then `tauri build` on Linux and Windows. Pushing a `v*` tag runs `release.yml`, which creates a draft GitHub release with the bundles. There are no frontend tests yet.

### Auto-update

- `tauri-plugin-updater` reads `https://github.com/rowvy/taurrent/releases/latest/download/latest.json` and verifies bundles against `plugins.updater.pubkey` in `tauri.conf.json`.
- Signed updater artifacts are enabled only in `src-tauri/tauri.release.conf.json`. `release.yml` passes it via `--config` and signs with the `TAURI_SIGNING_PRIVATE_KEY` secret.
- Plain `tauri build` (local and CI) therefore needs no key. Don't move `createUpdaterArtifacts` into the main config, or every unsigned build fails.
- The private key is at `~/.tauri/taurrent.key` on the maintainer's machine. Never commit it.
- `latest.json` only resolves once the draft release is published.
- The version to bump lives in `tauri.conf.json` (also `package.json` and `Cargo.toml`).

## Architecture

### Backend (`src-tauri/src/`)

- `lib.rs` — Tauri builder, all `#[tauri::command]`s, and `setup`. `setup` loads `SettingsStore`, then starts `Engine` with `block_on`, and registers both as managed state. Commands return `Result<T, String>`, built with `format!("{e:#}")` so the anyhow context chain reaches the UI.
- `engine.rs` — wraps `librqbit::Session`. It uses fastresume and JSON persistence in `app_data_dir/session`. **librqbit fixes the session's default output folder at startup**, so the user's download folder from settings must be passed per torrent through `AddTorrentOptions::output_folder`.
- `settings.rs` — app settings stored as JSON in `app_config_dir/settings.json` and written atomically (tmp file + rename). Every mutation goes through `update()`.
  - New fields need `#[serde(default)]` so old files still parse.
  - Each field must also be mirrored in `Settings` in `src/lib/api.ts` and in `DEMO_SETTINGS` in `src/hooks/use-settings.ts`.
- librqbit is built with `default-features = false, features = ["rust-tls"]`, so there is no OpenSSL dependency, which matters for Windows CI.
- Plugin and window permissions are declared in `capabilities/default.json`. A new plugin API or window call fails at runtime without a matching entry there.

### Frontend (`src/`)

- `App.tsx` owns the view state: the sidebar `Selection` (a status filter or settings) and the selected torrent. It composes `Titlebar`, `Sidebar`, `TorrentTable`, `SpeedChart` and `TransferStats`.
- `lib/api.ts` — typed `invoke` wrappers. `lib/types.ts` is the torrent data contract the backend is expected to produce (`TorrentSummary`, speed samples).
- **Demo mode:** `hooks/use-torrents.ts` exports `isDemo = !isTauri() || VITE_DEMO === "1"`.
  - In demo mode the hooks serve animated sample data (`lib/demo.ts`), and settings changes stay in memory.
  - The real engine is not wired to the UI yet (milestone M1), so outside demo mode the torrent list is empty.
- The custom titlebar (`components/layout/titlebar.tsx`) replaces native decorations (`"decorations": false` in `tauri.conf.json`). Dragging relies on `data-tauri-drag-region` plus the `core:window:*` permissions.
- **i18n** (`src/i18n/`) uses i18next with English and Russian.
  - `en.ts` is the source of truth. `ru.ts` is typed as `Messages`, so a missing Russian key is a type error.
  - `i18next.d.ts` makes `t()` keys type-checked.
  - The language comes from `settings.language` (`null` means follow the system) and is applied in `App` through `applyLanguage`.
  - `lib/format.ts` formats sizes, speeds, durations and ratios using `i18n.language` and the `units.*` strings. Always use these helpers for user-visible numbers.
- `hooks/use-updater.ts` checks for updates on startup when `settings.autoUpdate` is on (never in demo mode). Installing is always user-initiated, from `UpdateCard` in the sidebar or from Settings, and is followed by `relaunch()` from `plugin-process`.
- The theme lives in `hooks/use-theme.ts`: it toggles the `.dark` class on `<html>`, persists to localStorage, and defaults to dark.

### Styling

- Tailwind v4 has no config file. All design tokens are CSS variables in `src/index.css`: `:root` holds the light theme and `.dark` the dark one.
  - The accent is teal (`--primary`, used for download), plus `--upload` (lilac) and `--success`. They are exposed as Tailwind colors through `@theme inline`.
- shadcn/ui uses the `radix-nova` style. Add components with `npx shadcn@latest add <name>`; they land in `src/components/ui/` and import `cn` from the `cn` package (an official shadcn package). The `@/` alias points to `src/`.
- The font is Plus Jakarta Sans, bundled via `@fontsource-variable`. The app must work offline, so don't load fonts from a CDN.

### Brand assets

`assets/brand/` holds `mark.svg`, the wordmark lockups (outlined paths, so no font dependency) and `app-icon.svg`. To regenerate the app icons, render `app-icon.svg` to a 1024px PNG and run `npx tauri icon <png>`. Then delete `src-tauri/icons/android` and `src-tauri/icons/ios`, which aren't used.

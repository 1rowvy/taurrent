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

- `tauri-plugin-updater` reads `https://github.com/1rowvy/taurrent/releases/latest/download/latest.json` and verifies bundles against `plugins.updater.pubkey` in `tauri.conf.json`.
- Signed updater artifacts are enabled only in `src-tauri/tauri.release.conf.json`. `release.yml` passes it via `--config` and signs with the `TAURI_SIGNING_PRIVATE_KEY` secret.
- Plain `tauri build` (local and CI) therefore needs no key. Don't move `createUpdaterArtifacts` into the main config, or every unsigned build fails.
- The private key is at `~/.tauri/taurrent.key` on the maintainer's machine. Never commit it.
- `latest.json` only resolves once the draft release is published.
- The app version lives in `package.json`. `tauri.conf.json` points at it (`"version": "../package.json"`), and Vite exposes it as `__APP_VERSION__`, which the titlebar and Settings display. `Cargo.toml` has its own crate version, which can be bumped alongside.

## Architecture

### Backend (`src-tauri/src/`)

- `lib.rs` — Tauri builder, all `#[tauri::command]`s, and `setup`. `setup` loads `SettingsStore`, then starts `Engine` with `block_on`, and registers both as managed state. Commands return `Result<T, String>`, built with `format!("{e:#}")` so the anyhow context chain reaches the UI.
- `engine.rs` — wraps `librqbit::Session`. It uses fastresume and JSON persistence in `app_data_dir/session`, and maps librqbit stats to `TorrentSummary` (the shape in `src/lib/types.ts`).
  - **librqbit fixes the session's default output folder at startup**, so the user's download folder from settings must be passed per torrent through `AddTorrentOptions::output_folder`.
  - An explicit `output_folder` skips librqbit's per-torrent sub-folder for multi-file torrents. When the folder differs from the session default, `add_to` resolves metadata with `list_only` first and picks the sub-folder itself.
  - The add dialog is two-phase: `resolve_magnet` / `resolve_torrent_file` fetch metadata with `list_only` and keep it in `Engine::pending` (keyed by info hash), then `add_resolved` adds it with the chosen folder, file selection and paused flag, or `discard_resolved` drops it. A failed `add_resolved` puts the metadata back so the user can retry.
  - A task spawned in `setup` calls `Engine::tick` every second and emits the snapshot (torrents, totals, 60-sample speed history) as `torrents:update`, plus `torrent:completed` (torrent name) for downloads that finished. Only torrents seen in the downloading state count, so restoring complete torrents doesn't notify.
  - `Engine::details` (files with per-file progress, peers, trackers, output folder) backs the details panel; the frontend polls it via `hooks/use-torrent-details.ts` for the focused torrent.
- `tray.rs` — tray icon and menu (show/hide, pause/resume all, quit). Labels come from the frontend via `set_tray_labels`. `on_window_event` hides the window on close when `closeToTray` is on and the tray exists; quitting goes through `tray::quit`, which stops the session first.
- `open_requests.rs` — `magnet:` links and `.torrent` paths from argv (first launch, or forwarded by `tauri-plugin-single-instance`, which must stay the first plugin registered). They queue in `OpenRequests`; the backend emits `open:requested` and the frontend drains the queue with `take_open_requests`, so nothing is lost before the UI listens. Associations are declared in `tauri.conf.json` (`bundle.fileAssociations`, `plugins.deep-link`).
- `settings.rs` — app settings stored as JSON in `app_config_dir/settings.json` and written atomically (tmp file + rename). Every mutation goes through `update()`.
  - New fields need `#[serde(default)]` so old files still parse.
  - `connection` (port, UPnP, DHT, peer limit) is read only when the engine starts (`engine_options` in `lib.rs`); the UI compares it with the startup values and offers a restart. `limits` apply live through `Engine::set_limits`.
  - Each field must also be mirrored in `Settings` in `src/lib/api.ts` and in `DEMO_SETTINGS` in `src/hooks/use-settings.ts`.
- librqbit is built with `default-features = false, features = ["rust-tls"]`, so there is no OpenSSL dependency, which matters for Windows CI.
- Plugin and window permissions are declared in `capabilities/default.json`. A new plugin API or window call fails at runtime without a matching entry there.

### Frontend (`src/`)

- `App.tsx` owns the view state: the sidebar `Selection` (a status filter or settings) and the selected torrent. It composes `Titlebar`, `Sidebar`, `TorrentTable`, `SpeedChart` and `TransferStats`.
- `lib/api.ts` — typed `invoke` wrappers. `lib/types.ts` is the torrent data contract the backend is expected to produce (`TorrentSummary`, speed samples).
- `components/torrents/torrent-table.tsx` sorts (persisted in localStorage), virtualizes rows with `@tanstack/react-virtual`, and handles multi-select. `App` owns the selection set and the focused torrent (shown in `TransferStats`); row actions take arrays of ids.
- `components/details/details-panel.tsx` is the bottom panel with General / Files / Peers / Trackers tabs.
- `hooks/use-system-integration.ts` handles open requests (queued into the add dialog), tray labels on language change, and sends the completion notifications (the frontend owns i18n, so notifications are sent from JS).
- `hooks/use-torrent-drop.ts` listens to the webview's drag-drop events for `.torrent` files.
- `hooks/use-torrents.ts` loads `list_torrents`, then follows `torrents:update`, and exposes the torrent actions (add, pause, resume, remove). Action errors surface as sonner toasts from `App`.
- **Demo mode:** `hooks/use-torrents.ts` exports `isDemo = !isTauri() || VITE_DEMO === "1"`.
  - In demo mode the hooks serve animated sample data (`lib/demo.ts`). Settings changes, pause/resume/remove and the add dialog (always previewing `demoPreview`) stay in memory. Adding by path without the dialog (dropping several files) shows a "not available in demo" error.
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

# Developing Taurrent

Taurrent is built with [Tauri 2](https://tauri.app), React 19 + TypeScript and [librqbit](https://github.com/ikatson/rqbit). See [CLAUDE.md](../CLAUDE.md) for an architecture overview.

## Setup

Requirements: Node.js 22+, Rust stable, and the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS.

```sh
npm install
npm run tauri dev     # run the app with hot reload
npm run tauri build   # build installers into src-tauri/target/release/bundle
npm run dev           # frontend only, in a browser, with demo data
```

Checks that CI runs:

```sh
npm run build
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

## Releases

1. Bump `version` in `package.json` — the app and `tauri.conf.json` read it from there (optionally also `src-tauri/Cargo.toml`).
2. Push a `v*` tag (e.g. `v0.2.0`). GitHub Actions builds signed Linux and Windows bundles plus `latest.json` and attaches them to a draft release.
3. Publish the draft — installed apps pick up the update from `releases/latest/download/latest.json`.

### Auto-update signing

Updates are verified against the public key in `src-tauri/tauri.conf.json` (`plugins.updater.pubkey`). The private key lives outside the repo (`~/.tauri/taurrent.key`) and in the repository secrets `TAURI_SIGNING_PRIVATE_KEY` (key file contents) and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (empty). If the key is lost, existing installs can no longer be updated.

A signed build locally:

```sh
TAURI_SIGNING_PRIVATE_KEY=~/.tauri/taurrent.key TAURI_SIGNING_PRIVATE_KEY_PASSWORD="" \
  npm run tauri build -- --config src-tauri/tauri.release.conf.json
```

See [ROADMAP.md](ROADMAP.md) for the feature plan.

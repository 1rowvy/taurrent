# Taurrent

Cross-platform BitTorrent client built with [Tauri 2](https://tauri.app), React and [librqbit](https://github.com/ikatson/rqbit).

## Development

Requirements: Node.js 22+, Rust stable, and the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS.

```sh
npm install
npm run tauri dev     # run the app with hot reload
npm run tauri build   # build installers into src-tauri/target/release/bundle
```

## Releases

Push a `v*` tag (e.g. `v0.1.0`) — GitHub Actions builds Linux and Windows bundles and attaches them to a draft release.

See [docs/ROADMAP.md](docs/ROADMAP.md) for the feature plan.

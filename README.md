<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/brand/logo-dark.svg">
    <img src="assets/brand/logo-light.svg" alt="Taurrent" width="300">
  </picture>
</p>

<p align="center">
  A fast, lightweight BitTorrent client for Linux and Windows.
  <br>
  <a href="https://github.com/1rowvy/taurrent/releases/latest"><b>Download</b></a>
  ·
  <a href="README.ru.md">Русский</a>
</p>

<p align="center">
  <img src="docs/screenshots/main-dark.png" alt="Taurrent main window" width="860">
</p>

## Features

- **Add torrents your way:** paste a magnet link, open a `.torrent` file, drop files onto the window, or click a magnet link in your browser. Magnet links on the clipboard are picked up automatically.
- **Choose before you download:** see the torrent's contents first, pick only the files you want, choose where to save them, and start right away or later.
- **Everything at a glance:** live download and upload speed chart, progress, time left, seeds and peers. Sort by any column, select several torrents with Ctrl/Shift and act on all of them at once.
- **Details for each torrent:** per-file progress (and changing which files to download while it runs), connected peers, trackers, and one click to open the folder or a file.
- **Speed limits** that apply instantly, plus port, UPnP, DHT and peer limit settings.
- **Stays out of the way:** keeps running in the system tray, notifies you when a download finishes, and remembers everything between restarts.
- **Updates itself:** new versions are offered in the app and installed with one click.
- Light and dark themes, English and Russian interface.

<p align="center">
  <img src="docs/screenshots/add-dialog.png" alt="Choosing files before adding a torrent" width="420">
  <img src="docs/screenshots/files.png" alt="Per-file progress in the details panel" width="420">
</p>

## Download

Get the latest version from the [Releases page](https://github.com/1rowvy/taurrent/releases/latest).

| System | File |
|---|---|
| Windows 10 / 11 | `Taurrent_x.y.z_x64-setup.exe` (recommended) or `.msi` |
| Debian, Ubuntu, Mint | `Taurrent_x.y.z_amd64.deb` |
| Fedora, openSUSE | `Taurrent-x.y.z-1.x86_64.rpm` |
| Any other Linux | `Taurrent_x.y.z_amd64.AppImage` |

Only 64-bit x86 systems are supported for now.

### Installation notes

- **Windows:** the installer isn't code-signed yet, so SmartScreen may warn about an unknown publisher. Click **More info → Run anyway**.
- **AppImage:** make the file executable (`chmod +x Taurrent_*.AppImage`) and run it. On first launch it registers itself as the handler for magnet links.
- **Tray icon on Linux:** needs a desktop with a system tray (KDE, Cinnamon, XFCE, …). On GNOME, install the [AppIndicator extension](https://extensions.gnome.org/extension/615/appindicator-support/). Without a tray, closing the window quits the app.
- The `.deb`, `.rpm` and Windows installers register Taurrent as an app that can open `.torrent` files and `magnet:` links. If another client is already the default, choose Taurrent in your system's default apps settings.

## Tips

- **Ctrl+A** selects all torrents, **Esc** clears the selection, arrow keys move it. Right-click acts on everything selected.
- Double-click a file on the **Files** tab to open it, or right-click it to show it in its folder.
- Changes to the port, UPnP, DHT or peer limit take effect after a restart. Settings shows a **Restart now** button when one is needed.
- When "Keep running in the tray" is on, use **Quit** in the tray menu to exit completely.

<p align="center">
  <img src="docs/screenshots/main-light.png" alt="Taurrent in the light theme" width="860">
</p>

## Under the hood

Taurrent is built with [Tauri 2](https://tauri.app) and React, and uses [librqbit](https://github.com/ikatson/rqbit), a BitTorrent engine written in Rust. It starts quickly, uses little memory, and needs no extra runtime.

Bugs and ideas are welcome in [Issues](https://github.com/1rowvy/taurrent/issues). To build it yourself, see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md); the plan is in [docs/ROADMAP.md](docs/ROADMAP.md).

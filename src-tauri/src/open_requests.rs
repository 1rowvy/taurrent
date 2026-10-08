//! Torrents passed to the app from outside: `magnet:` links and `.torrent`
//! files given on the command line, by the OS file association or URL scheme
//! handler, or forwarded from a second instance.

use std::{path::PathBuf, sync::Mutex};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, Url};

/// Mirrors `AddSource` in `src/components/torrents/add-torrent.tsx`.
#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum OpenRequest {
    Magnet { url: String },
    File { path: PathBuf },
}

/// Requests waiting for the frontend. It drains them with
/// `take_open_requests` when it starts and whenever `open:requested` fires,
/// so nothing is lost if a request arrives before the UI listens.
#[derive(Default)]
pub struct OpenRequests(Mutex<Vec<OpenRequest>>);

impl OpenRequests {
    pub fn take(&self) -> Vec<OpenRequest> {
        std::mem::take(&mut self.0.lock().unwrap())
    }
}

/// Queues the torrents among `args` (program arguments, without argv[0]) and
/// tells the frontend. Returns whether there were any.
pub fn push_args(app: &AppHandle, args: impl IntoIterator<Item = String>) -> bool {
    let requests: Vec<_> = args.into_iter().filter_map(|a| parse(&a)).collect();
    if requests.is_empty() {
        return false;
    }
    app.state::<OpenRequests>()
        .0
        .lock()
        .unwrap()
        .extend(requests);
    let _ = app.emit("open:requested", ());
    true
}

fn parse(arg: &str) -> Option<OpenRequest> {
    if arg.len() >= 7 && arg.as_bytes()[..7].eq_ignore_ascii_case(b"magnet:") {
        return Some(OpenRequest::Magnet {
            url: arg.to_owned(),
        });
    }
    // Some desktop launchers pass file URLs instead of paths.
    let path = match Url::parse(arg) {
        Ok(url) if url.scheme() == "file" => url.to_file_path().ok()?,
        _ => PathBuf::from(arg),
    };
    let is_torrent = path
        .extension()
        .is_some_and(|e| e.eq_ignore_ascii_case("torrent"));
    (is_torrent && path.is_file()).then_some(OpenRequest::File { path })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_magnets_and_existing_torrent_files() {
        let tmp = tempfile::tempdir().unwrap();
        let file = tmp.path().join("юникод.TORRENT");
        std::fs::write(&file, b"").unwrap();

        assert_eq!(
            parse("magnet:?xt=urn:btih:abc"),
            Some(OpenRequest::Magnet {
                url: "magnet:?xt=urn:btih:abc".into()
            })
        );
        assert_eq!(
            parse(file.to_str().unwrap()),
            Some(OpenRequest::File { path: file.clone() })
        );
        let url = Url::from_file_path(&file).unwrap();
        assert_eq!(
            parse(url.as_str()),
            Some(OpenRequest::File { path: file.clone() })
        );
        assert_eq!(
            parse(tmp.path().join("missing.torrent").to_str().unwrap()),
            None
        );
        assert_eq!(parse("--flag"), None);
        assert_eq!(parse("mag"), None);
    }
}

// SeeCen desktop shell — wraps the built SPA in a native window.
// All app logic lives in the web frontend; data persists in the
// webview's localStorage, exactly like the browser version.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running SeeCen");
}

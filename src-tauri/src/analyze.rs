use std::time::Duration;
use tauri::Emitter;

#[tauri::command]
pub fn analyze_path(app_handle: tauri::AppHandle, path: String) -> Result<String, String> {
    let mole_path = super::mole::find_mole_path(Some(&app_handle))?;

    let _ = app_handle.emit("analyze:started", ());

    let mut cmd = super::mole::mole_command(&mole_path, "analyze");
    cmd.args(["--json", &path]);
    let raw_output = super::mole::run_mole_streaming(
        &mut cmd,
        &app_handle,
        "analyze:progress",
        Duration::from_secs(300),
    )?;

    let _ = app_handle.emit("analyze:completed", ());

    Ok(raw_output)
}

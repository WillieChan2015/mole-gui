use std::time::Duration;
use tauri::Emitter;
use tauri_plugin_notification::NotificationExt;

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PurgeResult {
    pub raw_output: String,
}

#[tauri::command]
pub fn purge_scan(app_handle: tauri::AppHandle) -> Result<PurgeResult, String> {
    let mole_path = super::mole::find_mole_path(Some(&app_handle))?;

    let _ = app_handle.emit("purge:scan_started", ());

    let mut cmd = super::mole::mole_dry_run_command(&mole_path, "purge");
    let raw_output = super::mole::run_mole_streaming(
        &mut cmd,
        &app_handle,
        "purge:progress",
        Duration::from_secs(300),
    )?;

    let _ = app_handle.emit("purge:scan_completed", ());

    Ok(PurgeResult { raw_output })
}

#[tauri::command]
pub fn purge_execute(app_handle: tauri::AppHandle) -> Result<PurgeResult, String> {
    let mole_path = super::mole::find_mole_path(Some(&app_handle))?;

    let _ = app_handle.emit("purge:execute_started", ());

    let mut cmd = super::mole::mole_command(&mole_path, "purge");
    let raw_output = super::mole::run_mole_streaming(
        &mut cmd,
        &app_handle,
        "purge:progress",
        Duration::from_secs(300),
    )?;

    let _ = app_handle
        .notification()
        .builder()
        .title("Purge complete")
        .body("Purge operation finished successfully.")
        .show();

    let _ = app_handle.emit("purge:execute_completed", ());

    Ok(PurgeResult { raw_output })
}

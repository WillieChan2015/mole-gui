use std::time::Duration;
use tauri::Emitter;
use tauri_plugin_notification::NotificationExt;

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OptimizeResult {
    pub raw_output: String,
}

#[tauri::command]
pub fn optimize_scan(app_handle: tauri::AppHandle) -> Result<OptimizeResult, String> {
    let mole_path = super::mole::find_mole_path(Some(&app_handle))?;

    let _ = app_handle.emit("optimize:scan_started", ());

    let mut cmd = super::mole::mole_dry_run_command(&mole_path, "optimize");
    let raw_output = super::mole::run_mole_streaming(
        &mut cmd,
        &app_handle,
        "optimize:progress",
        Duration::from_secs(300),
    )?;

    let _ = app_handle.emit("optimize:scan_completed", ());

    Ok(OptimizeResult { raw_output })
}

#[tauri::command]
pub fn optimize_execute(app_handle: tauri::AppHandle) -> Result<OptimizeResult, String> {
    let mole_path = super::mole::find_mole_path(Some(&app_handle))?;

    let _ = app_handle.emit("optimize:execute_started", ());

    let mut cmd = super::mole::mole_command(&mole_path, "optimize");
    let raw_output = super::mole::run_mole_streaming(
        &mut cmd,
        &app_handle,
        "optimize:progress",
        Duration::from_secs(300),
    )?;

    let _ = app_handle
        .notification()
        .builder()
        .title("Optimization complete")
        .body("Optimization operation finished successfully.")
        .show();

    let _ = app_handle.emit("optimize:execute_completed", ());

    Ok(OptimizeResult { raw_output })
}

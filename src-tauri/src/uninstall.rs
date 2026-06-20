use serde::{Deserialize, Serialize};
use std::time::Duration;
use tauri::Emitter;

#[derive(Debug, Deserialize, Serialize)]
pub struct AppInfo {
    pub name: String,
    pub bundle_id: String,
    pub source: String,
    pub uninstall_name: String,
    pub path: String,
    pub size: String,
}

#[tauri::command]
pub fn uninstall_list(app_handle: tauri::AppHandle) -> Result<Vec<AppInfo>, String> {
    let mole_path = super::mole::find_mole_path(Some(&app_handle))?;

    let _ = app_handle.emit("uninstall:scan_started", ());

    let mut cmd = super::mole::mole_command(&mole_path, "uninstall");
    cmd.arg("--list");
    let raw_output = super::mole::run_mole_streaming(
        &mut cmd,
        &app_handle,
        "uninstall:progress",
        Duration::from_secs(300),
    )?;

    let _ = app_handle.emit("uninstall:scan_completed", ());

    serde_json::from_str(&raw_output).map_err(|e| format!("failed to parse app list: {}", e))
}

#[tauri::command]
pub fn uninstall_app(app_handle: tauri::AppHandle, name: String) -> Result<String, String> {
    let mole_path = super::mole::find_mole_path(Some(&app_handle))?;

    let _ = app_handle.emit("uninstall:uninstall_started", ());

    let mut cmd = super::mole::mole_command(&mole_path, "uninstall");
    cmd.arg(&name);
    let raw_output = super::mole::run_mole_streaming(
        &mut cmd,
        &app_handle,
        "uninstall:progress",
        Duration::from_secs(300),
    )?;

    let _ = app_handle.emit("uninstall:uninstall_completed", ());

    Ok(raw_output)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn app_info_deserializes_from_json() {
        let json = r#"{
            "name": "Safari",
            "bundle_id": "com.apple.Safari",
            "source": "system",
            "uninstall_name": "Safari",
            "path": "/Applications/Safari.app",
            "size": "120MB"
        }"#;
        let info: AppInfo = serde_json::from_str(json).unwrap();
        assert_eq!(info.name, "Safari");
        assert_eq!(info.bundle_id, "com.apple.Safari");
        assert_eq!(info.source, "system");
        assert_eq!(info.uninstall_name, "Safari");
        assert_eq!(info.path, "/Applications/Safari.app");
        assert_eq!(info.size, "120MB");
    }

    #[test]
    fn app_info_serializes_to_json() {
        let info = AppInfo {
            name: "Safari".to_string(),
            bundle_id: "com.apple.Safari".to_string(),
            source: "system".to_string(),
            uninstall_name: "Safari".to_string(),
            path: "/Applications/Safari.app".to_string(),
            size: "120MB".to_string(),
        };
        let json = serde_json::to_value(&info).unwrap();
        assert_eq!(json["name"], "Safari");
        assert_eq!(json["bundle_id"], "com.apple.Safari");
        assert_eq!(json["source"], "system");
        assert_eq!(json["uninstall_name"], "Safari");
        assert_eq!(json["path"], "/Applications/Safari.app");
        assert_eq!(json["size"], "120MB");
    }
}

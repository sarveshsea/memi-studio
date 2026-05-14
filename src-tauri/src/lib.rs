// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

pub mod markdown_corpus;
mod studio;

use serde_json::{json, Value};
use sha2::{Digest, Sha256};
#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;
use std::{
    collections::BTreeMap,
    fs,
    io::{BufRead, BufReader, Read, Write},
    net::{SocketAddr, TcpStream},
    path::{Path, PathBuf},
    process::{Command, Stdio},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    thread,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter, Manager, State, WindowEvent};
use tauri_plugin_dialog::DialogExt;

const STUDIO_RUNTIME_PORT: u16 = 8765;
const STUDIO_RUNTIME_BIN: &str = "memi-studio-runtime";
const STUDIO_RUNTIME_RESOURCE_DIR: &str = "resources/memoire-runtime";
const RUNTIME_STARTUP_POLL_ATTEMPTS: usize = 40;
const MAX_MANAGED_RUNTIME_RESTARTS: u8 = 1;
const MANAGED_RUNTIME_PID_FILE: &str = "managed-runtime.json";
const RUNTIME_SIGNATURE_MANIFEST: &str = "source-signatures.json";
const RUNTIME_LIFECYCLE_LOG_FILE: &str = "lifecycle.jsonl";

#[derive(Debug, serde::Deserialize)]
struct RuntimeHarnessesPayload {
    harnesses: Vec<studio::HarnessStatus>,
}

#[derive(Default)]
struct AppState {
    runtime: Mutex<RuntimeProcessState>,
    runtime_restart_attempts: Mutex<u8>,
    markdown_corpus_cancel: AtomicBool,
}

#[derive(Default)]
struct RuntimeProcessState {
    child: Option<Arc<Mutex<std::process::Child>>>,
    status: Option<studio::StudioRuntimeStatus>,
    generation: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct RuntimeLaunchSource {
    binary: PathBuf,
    package_root: PathBuf,
    source_kind: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct MaterializedRuntime {
    binary: PathBuf,
    package_root: PathBuf,
    runtime_root: PathBuf,
    source_kind: String,
}

#[derive(Debug, Clone)]
struct RuntimeSupervisorTiming {
    generation: u64,
    supervisor_started: Instant,
    startup_started_at: String,
    cache_prepare_ms: u64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct ManagedRuntimePidFile {
    schema_version: u8,
    pid: u32,
    port: u16,
    api_token: String,
    workspace_root: String,
    package_root: String,
    runtime_binary: String,
    runtime_cache_root: String,
    started_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct RuntimeSignatureManifest {
    schema_version: u8,
    signatures: BTreeMap<String, String>,
}

#[tauri::command]
fn studio_status(app: AppHandle, state: State<AppState>) -> Result<studio::StudioStatus, String> {
    let workspace_root = workspace_root(&app)?;
    let mut status = studio::studio_status(&workspace_root);
    let runtime = current_runtime_status(&state, &workspace_root);
    if runtime.status == "running" {
        if let Some(harnesses) = runtime_harnesses(runtime.api_token.as_deref()) {
            status.harnesses = harnesses;
        }
    }
    status.runtime = Some(runtime);
    Ok(status)
}

#[tauri::command]
fn studio_runtime_status(
    app: AppHandle,
    state: State<AppState>,
) -> Result<studio::StudioRuntimeStatus, String> {
    let workspace_root = workspace_root(&app)?;
    Ok(current_runtime_status(&state, &workspace_root))
}

fn restart_studio_runtime_command(
    app: &AppHandle,
    state: &AppState,
    workspace_root: &Path,
) -> studio::StudioRuntimeStatus {
    reset_runtime_restart_attempts(state);
    request_studio_runtime_restart(app, state, workspace_root)
}

#[tauri::command]
fn restart_studio_runtime(
    app: AppHandle,
    state: State<AppState>,
) -> Result<studio::StudioRuntimeStatus, String> {
    let workspace_root = workspace_root(&app)?;
    Ok(restart_studio_runtime_command(&app, &state, &workspace_root))
}

#[tauri::command]
fn load_app_config(app: AppHandle) -> Result<studio::DesktopAppConfig, String> {
    load_or_create_desktop_app_config(&app)
}

#[tauri::command]
fn save_app_config(
    app: AppHandle,
    state: State<AppState>,
    config: studio::DesktopAppConfig,
) -> Result<studio::DesktopAppConfig, String> {
    let previous = load_or_create_desktop_app_config(&app)?;
    let next = normalized_app_config(config)?;
    studio::save_desktop_app_config(&app_config_dir(&app)?, &next)?;
    if previous.workspace_root != next.workspace_root {
        reset_runtime_restart_attempts(&state);
        request_studio_runtime_restart(&app, &state, Path::new(&next.workspace_root));
    }
    Ok(next)
}

#[tauri::command]
fn select_workspace(
    app: AppHandle,
    state: State<AppState>,
) -> Result<studio::DesktopAppConfig, String> {
    let result = open_workspace(app, state, None)?;
    serde_json::from_value(result.get("config").cloned().unwrap_or(Value::Null))
        .map_err(|err| format!("Failed to decode workspace config: {err}"))
}

#[tauri::command]
fn list_recent_workspaces(app: AppHandle) -> Result<Value, String> {
    let config = load_or_create_desktop_app_config(&app)?;
    Ok(json!({ "workspaces": config.recent_workspaces }))
}

#[tauri::command]
fn open_workspace(
    app: AppHandle,
    state: State<AppState>,
    path: Option<String>,
) -> Result<Value, String> {
    let current = load_or_create_desktop_app_config(&app)?;
    let workspace_root = if let Some(path) = path {
        PathBuf::from(path)
    } else {
        let picked = app
            .dialog()
            .file()
            .set_directory(&current.workspace_root)
            .blocking_pick_folder();
        let Some(picked) = picked else {
            return workspace_response(&app, &state, current, None, false);
        };
        picked
            .into_path()
            .map_err(|_| "Selected workspace is not a filesystem path".to_string())?
    };
    open_workspace_path(&app, &state, workspace_root, "open")
}

#[tauri::command]
fn create_workspace(
    app: AppHandle,
    state: State<AppState>,
    parent_path: Option<String>,
    name: String,
) -> Result<Value, String> {
    let parent = parent_path
        .map(PathBuf::from)
        .unwrap_or_else(default_new_workspace_parent);
    let folder_name = validate_new_workspace_name(&name)?;
    let workspace_root = parent.join(folder_name);
    fs::create_dir_all(&workspace_root).map_err(|err| {
        format!(
            "Failed to create Studio workspace {}: {err}",
            workspace_root.display()
        )
    })?;
    seed_project_studio_config(&workspace_root)?;
    open_workspace_path(&app, &state, workspace_root, "create")
}

#[tauri::command]
fn agent_install(
    target: String,
    project: String,
    dry_run: Option<bool>,
    force: Option<bool>,
) -> Result<Value, String> {
    let command = studio::build_agent_install_command(
        &target,
        &project,
        dry_run.unwrap_or(false),
        force.unwrap_or(false),
    )?;
    let output = Command::new(&command.command)
        .args(&command.args)
        .current_dir(PathBuf::from(&project))
        .output()
        .map_err(|err| format!("Failed to start {}: {err}", command.command))?;

    if !output.status.success() {
        let stderr = studio::redact_secrets(&String::from_utf8_lossy(&output.stderr));
        let stdout = studio::redact_secrets(&String::from_utf8_lossy(&output.stdout));
        let message = if !stderr.trim().is_empty() {
            stderr
        } else {
            stdout
        };
        return Err(message.trim().to_string());
    }

    serde_json::from_slice::<Value>(&output.stdout)
        .map_err(|err| format!("Failed to parse memi agent install JSON: {err}"))
}

#[tauri::command]
fn capture_attachment(app: AppHandle, payload: Value) -> Result<Value, String> {
    let root = workspace_root(&app)?;
    let session_id = payload.get("sessionId").and_then(Value::as_str).unwrap_or("draft");
    let id = format!("attachment-{}", studio::unix_millis());
    let name = slug(payload.get("name").and_then(Value::as_str).unwrap_or("attachment"));
    let mime_type = payload.get("mimeType").and_then(Value::as_str).unwrap_or("application/octet-stream");
    let kind = payload.get("kind").and_then(Value::as_str).unwrap_or("file");
    let source = payload.get("source").and_then(Value::as_str).unwrap_or("file");
    let dir = root.join(".memoire").join("studio").join("attachments").join(slug(session_id));
    fs::create_dir_all(&dir).map_err(|err| err.to_string())?;
    let path = dir.join(format!("{id}-{name}"));
    let bytes = payload
        .get("text")
        .and_then(Value::as_str)
        .or_else(|| payload.get("dataUrl").and_then(Value::as_str))
        .unwrap_or("")
        .as_bytes()
        .to_vec();
    fs::write(&path, &bytes).map_err(|err| err.to_string())?;
    let attachment = json!({
        "id": id,
        "kind": kind,
        "name": name,
        "mimeType": mime_type,
        "size": bytes.len(),
        "source": source,
        "path": path.to_string_lossy().to_string(),
        "text": if kind == "text" { payload.get("text").cloned().unwrap_or(Value::Null) } else { Value::Null },
        "previewUrl": Value::Null,
        "sessionId": if session_id == "draft" { Value::Null } else { Value::String(session_id.to_string()) },
        "createdAt": studio::unix_millis().to_string()
    });
    fs::write(dir.join(format!("{id}.json")), serde_json::to_string_pretty(&attachment).map_err(|err| err.to_string())?).map_err(|err| err.to_string())?;
    Ok(attachment)
}

#[tauri::command]
fn get_attachment(app: AppHandle, id: String) -> Result<Value, String> {
    let root = workspace_root(&app)?.join(".memoire").join("studio").join("attachments");
    for entry in fs::read_dir(root).map_err(|err| err.to_string())? {
        let entry = entry.map_err(|err| err.to_string())?;
        let path = entry.path().join(format!("{id}.json"));
        if path.is_file() {
            return serde_json::from_str(&fs::read_to_string(path).map_err(|err| err.to_string())?).map_err(|err| err.to_string());
        }
    }
    Err(format!("Unknown attachment: {id}"))
}

fn slug(value: &str) -> String {
    let slug: String = value
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() {
                ch.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect::<String>()
        .trim_matches('-')
        .chars()
        .take(96)
        .collect();
    if slug.is_empty() {
        "artifact".to_string()
    } else {
        slug
    }
}

fn app_config_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map_err(|err| format!("Failed to resolve Studio app config directory: {err}"))
}

fn load_or_create_desktop_app_config(app: &AppHandle) -> Result<studio::DesktopAppConfig, String> {
    let dir = app_config_dir(app)?;
    let config = studio::load_desktop_app_config(&dir)?;
    let path = studio::desktop_app_config_path(&dir);
    if !path.exists() {
        studio::save_desktop_app_config(&dir, &config)?;
    }
    Ok(config)
}

fn normalized_app_config(
    config: studio::DesktopAppConfig,
) -> Result<studio::DesktopAppConfig, String> {
    let workspace_root = PathBuf::from(config.workspace_root.trim());
    if !workspace_root.is_dir() {
        return Err(format!(
            "Workspace root is not a directory: {}",
            workspace_root.display()
        ));
    }
    Ok(studio::DesktopAppConfig {
        schema_version: 1,
        workspace_root: workspace_root.to_string_lossy().to_string(),
        recent_workspaces: config.recent_workspaces,
    })
}

fn open_workspace_path(
    app: &AppHandle,
    state: &AppState,
    workspace_root: PathBuf,
    source: &str,
) -> Result<Value, String> {
    let workspace_root = workspace_root
        .canonicalize()
        .unwrap_or(workspace_root);
    if !workspace_root.is_dir() {
        return Err(format!(
            "Selected workspace is not a directory: {}",
            workspace_root.display()
        ));
    }
    if is_sensitive_workspace(&workspace_root) {
        return Err(format!(
            "Open folder refused sensitive path: {}",
            workspace_root.display()
        ));
    }
    let mut next = load_or_create_desktop_app_config(app)?;
    let previous_root = next.workspace_root.clone();
    next.schema_version = 1;
    next.workspace_root = workspace_root.to_string_lossy().to_string();
    studio::record_recent_workspace(&mut next, &workspace_root, source);
    studio::save_desktop_app_config(&app_config_dir(app)?, &next)?;
    let restart_required = previous_root != next.workspace_root;
    let runtime = if restart_required {
        Some(restart_studio_runtime_command(app, state, &workspace_root))
    } else {
        Some(current_runtime_status(state, &workspace_root))
    };
    workspace_response(app, state, next, runtime, restart_required)
}

fn workspace_response(
    app: &AppHandle,
    state: &AppState,
    config: studio::DesktopAppConfig,
    runtime: Option<studio::StudioRuntimeStatus>,
    restart_required: bool,
) -> Result<Value, String> {
    let workspace_root = PathBuf::from(&config.workspace_root);
    let workspace = config
        .recent_workspaces
        .iter()
        .find(|item| item.path == config.workspace_root)
        .cloned()
        .unwrap_or_else(|| studio::RecentWorkspace {
            path: config.workspace_root.clone(),
            name: workspace_root
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or(&config.workspace_root)
                .to_string(),
            opened_at: studio::unix_millis().to_string(),
            source: "runtime".to_string(),
        });
    Ok(json!({
        "workspace": workspace,
        "recent": config.recent_workspaces,
        "config": config,
        "runtime": runtime.unwrap_or_else(|| current_runtime_status(state, &workspace_root)),
        "restartRequired": restart_required,
        "permissions": {
            "homeRoot": home_root().to_string_lossy().to_string(),
            "currentWorkspace": workspace_root.to_string_lossy().to_string(),
            "homeWideAccess": true,
            "workspaceRoots": [workspace_root.to_string_lossy().to_string()],
            "denylist": sensitive_workspace_paths(),
            "allowlist": [workspace_root.to_string_lossy().to_string()],
        },
        "appConfigPath": studio::desktop_app_config_path(&app_config_dir(app).unwrap_or_else(|_| PathBuf::from("."))).to_string_lossy().to_string()
    }))
}

fn default_new_workspace_parent() -> PathBuf {
    home_root().join("Desktop")
}

fn home_root() -> PathBuf {
    std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("/"))
}

fn validate_new_workspace_name(name: &str) -> Result<String, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("New folder requires a name".to_string());
    }
    if trimmed == "." || trimmed == ".." || trimmed.contains('/') || trimmed.contains('\\') {
        return Err(format!("New folder name is not valid: {trimmed}"));
    }
    Ok(trimmed.to_string())
}

fn is_sensitive_workspace(path: &Path) -> bool {
    sensitive_workspace_paths()
        .into_iter()
        .map(PathBuf::from)
        .any(|sensitive| path.starts_with(sensitive))
}

fn sensitive_workspace_paths() -> Vec<String> {
    let home = home_root();
    vec![
        PathBuf::from("/Applications"),
        PathBuf::from("/Library"),
        PathBuf::from("/System"),
        PathBuf::from("/bin"),
        PathBuf::from("/etc"),
        PathBuf::from("/sbin"),
        PathBuf::from("/usr"),
        PathBuf::from("/Volumes"),
        home.join(".aws"),
        home.join(".config").join("gh"),
        home.join(".gnupg"),
        home.join(".netrc"),
        home.join(".npmrc"),
        home.join(".pypirc"),
        home.join(".ssh"),
        home.join(".Trash"),
        home.join("Library").join("Keychains"),
    ]
    .into_iter()
    .map(|path| path.to_string_lossy().to_string())
    .collect()
}

fn seed_project_studio_config(workspace_root: &Path) -> Result<(), String> {
    let dir = workspace_root.join(".memoire").join("studio");
    fs::create_dir_all(&dir).map_err(|err| err.to_string())?;
    let raw = json!({
        "schemaVersion": 1,
        "workspaceRoots": [workspace_root.to_string_lossy().to_string()],
        "defaultHarness": "codex",
        "agentProfiles": [{
            "id": "design",
            "name": "Design",
            "defaultHarness": "codex",
            "defaultAction": "app-build",
            "model": null,
            "autonomy": "autonomous"
        }]
    });
    fs::write(
        dir.join("config.json"),
        format!(
            "{}\n",
            serde_json::to_string_pretty(&raw).map_err(|err| err.to_string())?
        ),
    )
    .map_err(|err| err.to_string())
}

fn workspace_root(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(PathBuf::from(
        load_or_create_desktop_app_config(app)?.workspace_root,
    ))
}

fn current_runtime_status(state: &AppState, workspace_root: &Path) -> studio::StudioRuntimeStatus {
    let runtime = state.runtime.lock().expect("runtime state lock");
    runtime.status.clone().unwrap_or_else(|| {
        runtime_status(
            "stopped",
            None,
            workspace_root,
            None,
            None,
            Some("Studio runtime has not started yet".to_string()),
        )
    })
}

fn request_studio_runtime_restart(
    app: &AppHandle,
    state: &AppState,
    workspace_root: &Path,
) -> studio::StudioRuntimeStatus {
    let mut status = runtime_status("starting", None, workspace_root, None, None, None);
    status.supervisor_phase = Some("queued".to_string());
    status.startup_started_at = Some(studio::unix_millis().to_string());
    let generation = begin_runtime_supervisor(state, status.clone());
    append_runtime_lifecycle_log(
        app,
        "runtime.supervisor.queued",
        json!({
            "generation": generation,
            "workspaceRoot": workspace_root.to_string_lossy().to_string()
        }),
    );
    let app = app.clone();
    let workspace_root = workspace_root.to_path_buf();
    thread::spawn(move || {
        if let Some(state) = app.try_state::<AppState>() {
            let _ = restart_studio_runtime_process(&app, &state, &workspace_root, generation);
        }
    });
    status
}

fn begin_runtime_supervisor(state: &AppState, status: studio::StudioRuntimeStatus) -> u64 {
    let mut runtime = state.runtime.lock().expect("runtime state lock");
    runtime.generation = runtime.generation.wrapping_add(1);
    runtime.status = Some(status);
    runtime.generation
}

fn current_runtime_generation(state: &AppState) -> u64 {
    state.runtime.lock().expect("runtime state lock").generation
}

fn set_runtime_status_for_generation(
    state: &AppState,
    status: studio::StudioRuntimeStatus,
    child: Option<Arc<Mutex<std::process::Child>>>,
    generation: u64,
) -> bool {
    let mut runtime = state.runtime.lock().expect("runtime state lock");
    if runtime.generation != generation {
        return false;
    }
    runtime.status = Some(status);
    runtime.child = child;
    true
}

fn restart_studio_runtime_process(
    app: &AppHandle,
    state: &AppState,
    workspace_root: &Path,
    generation: u64,
) -> studio::StudioRuntimeStatus {
    let supervisor_started = Instant::now();
    let startup_started_at = studio::unix_millis().to_string();
    if current_runtime_generation(state) != generation {
        return current_runtime_status(state, workspace_root);
    }
    let child = take_runtime_child_for_stop(state);
    if let Some(pid) = stop_runtime_child(child) {
        clear_managed_runtime_pid_file(app, Some(pid));
    }
    if current_runtime_generation(state) != generation {
        return current_runtime_status(state, workspace_root);
    }

    let mut preparing = runtime_status("starting", None, workspace_root, None, None, None);
    preparing.supervisor_phase = Some("preparing-runtime".to_string());
    preparing.startup_started_at = Some(startup_started_at.clone());
    preparing.startup_ms = Some(elapsed_ms(supervisor_started));
    let _ = set_runtime_status_for_generation(state, preparing, None, generation);
    append_runtime_lifecycle_log(
        app,
        "runtime.supervisor.preparing",
        json!({
            "generation": generation,
            "workspaceRoot": workspace_root.to_string_lossy().to_string()
        }),
    );

    for _ in 0..20 {
        if !local_port_open(STUDIO_RUNTIME_PORT) {
            break;
        }
        thread::sleep(Duration::from_millis(100));
    }
    if local_port_open(STUDIO_RUNTIME_PORT) {
        if let Err(error) = replace_managed_orphan_runtime(app, workspace_root) {
            let _ = app.emit(
                "studio-runtime-log",
                json!({
                    "stream": "system",
                    "message": error,
                    "timestamp": studio::unix_millis().to_string()
                }),
            );
        }
    }
    for _ in 0..20 {
        if !local_port_open(STUDIO_RUNTIME_PORT) {
            break;
        }
        thread::sleep(Duration::from_millis(100));
    }

    if local_port_open(STUDIO_RUNTIME_PORT) {
        if runtime_answers_status(STUDIO_RUNTIME_PORT) {
            let mut status = runtime_status("running", None, workspace_root, None, None, None);
            status.runtime_source = Some("attached-existing-runtime".to_string());
            status.supervisor_phase = Some("attached".to_string());
            status.startup_started_at = Some(startup_started_at.clone());
            status.startup_ms = Some(elapsed_ms(supervisor_started));
            let _ = set_runtime_status_for_generation(state, status.clone(), None, generation);
            append_runtime_lifecycle_log(
                app,
                "runtime.attached-existing",
                json!({
                    "generation": generation,
                    "port": STUDIO_RUNTIME_PORT,
                    "startupMs": status.startup_ms
                }),
            );
            let _ = app.emit(
                "studio-runtime-log",
                json!({
                    "stream": "system",
                    "message": format!("Attached to an existing Mémoire Studio runtime on 127.0.0.1:{STUDIO_RUNTIME_PORT}. Restart runtime after quitting that process to replace it."),
                    "timestamp": studio::unix_millis().to_string()
                }),
            );
            return status;
        }
        let status = runtime_status(
            "error",
            None,
            workspace_root,
            None,
            None,
            Some(format!(
                "Port {STUDIO_RUNTIME_PORT} is already in use by a process that does not expose the Mémoire Studio runtime status API. Quit that process or free 127.0.0.1:{STUDIO_RUNTIME_PORT}."
            )),
        );
        let mut status = status;
        status.supervisor_phase = Some("port-blocked".to_string());
        status.startup_started_at = Some(startup_started_at.clone());
        status.startup_ms = Some(elapsed_ms(supervisor_started));
        let _ = set_runtime_status_for_generation(state, status.clone(), None, generation);
        append_runtime_lifecycle_log(
            app,
            "runtime.port-blocked",
            json!({
                "generation": generation,
                "port": STUDIO_RUNTIME_PORT,
                "startupMs": status.startup_ms
            }),
        );
        return status;
    }

    let source = match resolve_runtime_launch_source(app) {
        Ok(source) => source,
        Err(error) => {
            let mut status = runtime_status("error", None, workspace_root, None, None, Some(error));
            status.supervisor_phase = Some("resolve-failed".to_string());
            status.startup_started_at = Some(startup_started_at.clone());
            status.startup_ms = Some(elapsed_ms(supervisor_started));
            let _ = set_runtime_status_for_generation(state, status.clone(), None, generation);
            append_runtime_lifecycle_log(
                app,
                "runtime.resolve-failed",
                json!({
                    "generation": generation,
                    "startupMs": status.startup_ms,
                    "error": status.error.clone()
                }),
            );
            return status;
        }
    };
    let cache_started = Instant::now();
    let materialized = match materialize_runtime_for_app(app, &source) {
        Ok(runtime) => runtime,
        Err(error) => {
            let cache_root = runtime_cache_root(app)
                .map(|path| path.to_string_lossy().to_string())
                .unwrap_or_else(|err| format!("unavailable: {err}"));
            let mut status = runtime_status(
                "error",
                None,
                workspace_root,
                None,
                Some(source.package_root.to_string_lossy().to_string()),
                Some(format!(
                    "Failed to prepare cached Studio runtime from {} and {} into {}: {error}",
                    source.binary.display(),
                    source.package_root.display(),
                    cache_root
                )),
            );
            status.runtime_binary = Some(source.binary.to_string_lossy().to_string());
            status.runtime_source = Some(source.source_kind.clone());
            status.runtime_cache_root = Some(cache_root);
            status.supervisor_phase = Some("cache-failed".to_string());
            status.startup_started_at = Some(startup_started_at.clone());
            status.cache_prepare_ms = Some(elapsed_ms(cache_started));
            status.startup_ms = Some(elapsed_ms(supervisor_started));
            let _ = set_runtime_status_for_generation(state, status.clone(), None, generation);
            append_runtime_lifecycle_log(
                app,
                "runtime.cache-failed",
                json!({
                    "generation": generation,
                    "sourceKind": status.runtime_source.clone(),
                    "runtimeCacheRoot": status.runtime_cache_root.clone(),
                    "cachePrepareMs": status.cache_prepare_ms,
                    "startupMs": status.startup_ms,
                    "error": status.error.clone()
                }),
            );
            return status;
        }
    };
    let cache_prepare_ms = elapsed_ms(cache_started);
    append_runtime_lifecycle_log(
        app,
        "runtime.cache-prepared",
        json!({
            "generation": generation,
            "runtimeCacheRoot": materialized.runtime_root.to_string_lossy().to_string(),
            "sourceKind": materialized.source_kind.clone(),
            "cachePrepareMs": cache_prepare_ms
        }),
    );
    let package_root = materialized.package_root.clone();
    let binary = materialized.binary.clone();

    let api_token = generate_runtime_api_token();
    let mut child = match Command::new(&binary)
        .args([
            "studio",
            "serve",
            "--port",
            &STUDIO_RUNTIME_PORT.to_string(),
            "--json",
        ])
        .current_dir(workspace_root)
        .env("MEMOIRE_PACKAGE_ROOT", &package_root)
        .env("MEMOIRE_STUDIO_API_TOKEN", &api_token)
        .env("MEMOIRE_STUDIO_MANAGED_BY", "tauri")
        .env("NODE_ENV", "production")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
    {
        Ok(child) => child,
        Err(error) => {
            let mut status = runtime_status(
                "error",
                None,
                workspace_root,
                Some(api_token.clone()),
                Some(package_root.to_string_lossy().to_string()),
                Some(format!(
                    "Failed to start bundled Studio runtime {}: {error}",
                    binary.display()
                )),
            );
            apply_runtime_diagnostics(&mut status, &materialized);
            status.supervisor_phase = Some("spawn-failed".to_string());
            status.startup_started_at = Some(startup_started_at.clone());
            status.cache_prepare_ms = Some(cache_prepare_ms);
            status.startup_ms = Some(elapsed_ms(supervisor_started));
            let _ = set_runtime_status_for_generation(state, status.clone(), None, generation);
            append_runtime_lifecycle_log(
                app,
                "runtime.spawn-failed",
                json!({
                    "generation": generation,
                    "runtimeBinary": status.runtime_binary.clone(),
                    "runtimeCacheRoot": status.runtime_cache_root.clone(),
                    "cachePrepareMs": status.cache_prepare_ms,
                    "startupMs": status.startup_ms,
                    "error": status.error.clone()
                }),
            );
            return status;
        }
    };

    let pid = child.id();
    if let Some(stdout) = child.stdout.take() {
        spawn_runtime_reader(app.clone(), "stdout", stdout);
    }
    if let Some(stderr) = child.stderr.take() {
        spawn_runtime_reader(app.clone(), "stderr", stderr);
    }

    let child = Arc::new(Mutex::new(child));
    if let Err(error) =
        write_managed_runtime_pid_file(app, pid, &api_token, workspace_root, &materialized)
    {
        append_runtime_lifecycle_log(
            app,
            "runtime.pid-file-failed",
            json!({
                "generation": generation,
                "pid": pid,
                "error": error.clone()
            }),
        );
        let _ = app.emit(
            "studio-runtime-log",
            json!({
                "stream": "system",
                "message": error,
                "timestamp": studio::unix_millis().to_string()
            }),
        );
    }
    let mut status = runtime_status(
        "starting",
        Some(pid),
        workspace_root,
        Some(api_token.clone()),
        Some(package_root.to_string_lossy().to_string()),
        None,
    );
    apply_runtime_diagnostics(&mut status, &materialized);
    status.supervisor_phase = Some("spawned".to_string());
    status.startup_started_at = Some(startup_started_at.clone());
    status.cache_prepare_ms = Some(cache_prepare_ms);
    status.startup_ms = Some(elapsed_ms(supervisor_started));
    let _ =
        set_runtime_status_for_generation(state, status.clone(), Some(child.clone()), generation);
    append_runtime_lifecycle_log(
        app,
        "runtime.spawned",
        json!({
            "generation": generation,
            "pid": pid,
            "runtimeBinary": status.runtime_binary.clone(),
            "runtimeCacheRoot": status.runtime_cache_root.clone(),
            "cachePrepareMs": status.cache_prepare_ms,
            "startupMs": status.startup_ms
        }),
    );
    spawn_runtime_ready_watcher(
        app.clone(),
        child.clone(),
        workspace_root.to_path_buf(),
        materialized.clone(),
        Some(api_token.clone()),
        RuntimeSupervisorTiming {
            generation,
            supervisor_started,
            startup_started_at,
            cache_prepare_ms,
        },
    );
    spawn_runtime_waiter(
        app.clone(),
        child,
        workspace_root.to_path_buf(),
        materialized,
        Some(api_token),
        generation,
    );
    status
}

fn stop_studio_runtime(app: &AppHandle, state: &AppState) {
    let child = take_runtime_child_for_stop(state);
    if let Some(pid) = stop_runtime_child(child) {
        clear_managed_runtime_pid_file(app, Some(pid));
        append_runtime_lifecycle_log(
            app,
            "runtime.stop",
            json!({
                "pid": pid,
                "signal": "SIGTERM",
                "fallback": "SIGKILL"
            }),
        );
    }
    mark_runtime_stopped_after_stop(state);
}

fn take_runtime_child_for_stop(state: &AppState) -> Option<Arc<Mutex<std::process::Child>>> {
    let mut runtime = state.runtime.lock().expect("runtime state lock");
    if let Some(status) = runtime.status.as_mut() {
        status.status = "stopping".to_string();
        status.error = None;
    }
    runtime.child.take()
}

fn stop_runtime_child(child: Option<Arc<Mutex<std::process::Child>>>) -> Option<u32> {
    let child = child?;
    let Ok(mut child) = child.lock() else {
        return None;
    };
    let pid = child.id();
    if matches!(child.try_wait(), Ok(Some(_))) {
        return Some(pid);
    }
    terminate_child_gracefully(&mut child, Duration::from_secs(2));
    Some(pid)
}

fn terminate_child_gracefully(child: &mut std::process::Child, grace_period: Duration) {
    #[cfg(unix)]
    {
        let _ = send_process_signal(child.id(), libc::SIGTERM);
    }
    #[cfg(not(unix))]
    {
        let _ = child.kill();
    }
    let deadline = Instant::now() + grace_period;
    while Instant::now() < deadline {
        match child.try_wait() {
            Ok(Some(_)) => return,
            Ok(None) => thread::sleep(Duration::from_millis(50)),
            Err(_) => return,
        }
    }
    let _ = child.kill();
    let _ = child.wait();
}

fn mark_runtime_stopped_after_stop(state: &AppState) {
    let mut runtime = state.runtime.lock().expect("runtime state lock");
    if runtime.child.is_none() {
        if let Some(status) = runtime.status.as_mut() {
            status.status = "stopped".to_string();
            status.pid = None;
            status.api_token = None;
            status.error = None;
        }
    }
}

fn apply_runtime_diagnostics(
    status: &mut studio::StudioRuntimeStatus,
    runtime: &MaterializedRuntime,
) {
    status.runtime_binary = Some(runtime.binary.to_string_lossy().to_string());
    status.runtime_source = Some(runtime.source_kind.clone());
    status.runtime_cache_root = Some(runtime.runtime_root.to_string_lossy().to_string());
}

fn runtime_status(
    status: &str,
    pid: Option<u32>,
    workspace_root: &Path,
    api_token: Option<String>,
    package_root: Option<String>,
    error: Option<String>,
) -> studio::StudioRuntimeStatus {
    studio::StudioRuntimeStatus {
        status: status.to_string(),
        port: STUDIO_RUNTIME_PORT,
        url: format!("http://127.0.0.1:{STUDIO_RUNTIME_PORT}"),
        pid,
        workspace_root: workspace_root.to_string_lossy().to_string(),
        api_token,
        package_root,
        runtime_binary: None,
        runtime_source: None,
        runtime_cache_root: None,
        supervisor_phase: None,
        startup_started_at: None,
        startup_ms: None,
        cache_prepare_ms: None,
        error,
    }
}

fn elapsed_ms(start: Instant) -> u64 {
    start.elapsed().as_millis().min(u128::from(u64::MAX)) as u64
}

fn generate_runtime_api_token() -> String {
    let mut bytes = [0_u8; 32];
    if let Ok(mut file) = fs::File::open("/dev/urandom") {
        if file.read_exact(&mut bytes).is_ok() {
            return hex_bytes(&bytes);
        }
    }
    let fallback = format!("{}-{}", std::process::id(), studio::unix_millis());
    hex_bytes(&Sha256::digest(fallback.as_bytes()))
}

fn hex_bytes(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

fn managed_runtime_pid_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(managed_runtime_pid_file_path_for_cache_root(&runtime_cache_root(app)?))
}

fn managed_runtime_pid_file_path_for_cache_root(cache_root: &Path) -> PathBuf {
    cache_root.join(MANAGED_RUNTIME_PID_FILE)
}

fn runtime_lifecycle_log_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(runtime_cache_root(app)?.join(RUNTIME_LIFECYCLE_LOG_FILE))
}

fn append_runtime_lifecycle_log(app: &AppHandle, event: &str, payload: Value) {
    let Ok(path) = runtime_lifecycle_log_path(app) else {
        return;
    };
    let _ = append_runtime_lifecycle_log_at(&path, event, payload);
}

fn append_runtime_lifecycle_log_at(path: &Path, event: &str, payload: Value) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| {
            format!(
                "Failed to create Studio runtime lifecycle log directory {}: {err}",
                parent.display()
            )
        })?;
    }
    let entry = json!({
        "schemaVersion": 1,
        "timestamp": studio::unix_millis().to_string(),
        "event": event,
        "payload": payload
    });
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .map_err(|err| {
            format!(
                "Failed to open Studio runtime lifecycle log {}: {err}",
                path.display()
            )
        })?;
    writeln!(
        file,
        "{}",
        serde_json::to_string(&entry).map_err(|err| err.to_string())?
    )
    .map_err(|err| {
        format!(
            "Failed to write Studio runtime lifecycle log {}: {err}",
            path.display()
        )
    })
}

fn write_managed_runtime_pid_file(
    app: &AppHandle,
    pid: u32,
    api_token: &str,
    workspace_root: &Path,
    runtime: &MaterializedRuntime,
) -> Result<(), String> {
    let path = managed_runtime_pid_file_path(app)?;
    write_managed_runtime_pid_file_at(
        &path,
        &ManagedRuntimePidFile {
            schema_version: 1,
            pid,
            port: STUDIO_RUNTIME_PORT,
            api_token: api_token.to_string(),
            workspace_root: workspace_root.to_string_lossy().to_string(),
            package_root: runtime.package_root.to_string_lossy().to_string(),
            runtime_binary: runtime.binary.to_string_lossy().to_string(),
            runtime_cache_root: runtime.runtime_root.to_string_lossy().to_string(),
            started_at: studio::unix_millis().to_string(),
        },
    )
}

fn write_managed_runtime_pid_file_at(
    path: &Path,
    pid_file: &ManagedRuntimePidFile,
) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| {
            format!(
                "Failed to create Studio runtime pid directory {}: {err}",
                parent.display()
            )
        })?;
    }
    let staging = path.with_extension(format!("json.tmp-{}", std::process::id()));
    fs::write(
        &staging,
        format!(
            "{}\n",
            serde_json::to_string_pretty(pid_file).map_err(|err| err.to_string())?
        ),
    )
    .map_err(|err| {
        format!(
            "Failed to write Studio runtime pid file {}: {err}",
            staging.display()
        )
    })?;
    fs::rename(&staging, path).map_err(|err| {
        let _ = fs::remove_file(&staging);
        format!(
            "Failed to activate Studio runtime pid file {}: {err}",
            path.display()
        )
    })
}

fn read_managed_runtime_pid_file(app: &AppHandle) -> Option<ManagedRuntimePidFile> {
    let path = managed_runtime_pid_file_path(app).ok()?;
    read_managed_runtime_pid_file_at(&path)
}

fn read_managed_runtime_pid_file_at(path: &Path) -> Option<ManagedRuntimePidFile> {
    serde_json::from_str::<ManagedRuntimePidFile>(&fs::read_to_string(path).ok()?).ok()
}

fn clear_managed_runtime_pid_file(app: &AppHandle, expected_pid: Option<u32>) {
    let Ok(path) = managed_runtime_pid_file_path(app) else {
        return;
    };
    clear_managed_runtime_pid_file_at(&path, expected_pid);
}

fn clear_managed_runtime_pid_file_at(path: &Path, expected_pid: Option<u32>) {
    if let Some(expected_pid) = expected_pid {
        if read_managed_runtime_pid_file_at(path)
            .map(|pid_file| pid_file.pid != expected_pid)
            .unwrap_or(false)
        {
            return;
        }
    }
    let _ = fs::remove_file(path);
}

fn replace_managed_orphan_runtime(app: &AppHandle, workspace_root: &Path) -> Result<bool, String> {
    let Some(pid_file) = read_managed_runtime_pid_file(app) else {
        return Ok(false);
    };
    if !process_exists(pid_file.pid) {
        clear_managed_runtime_pid_file(app, Some(pid_file.pid));
        append_runtime_lifecycle_log(
            app,
            "runtime.orphan.stale-pid-file",
            json!({
                "pid": pid_file.pid,
                "port": pid_file.port
            }),
        );
        return Ok(false);
    }
    let token_status_ok = matches!(
        local_http_get_with_token(pid_file.port, "/api/status", Some(&pid_file.api_token)),
        Some((200, _))
    );
    if !should_replace_managed_runtime_pid_file(&pid_file, true, token_status_ok) {
        append_runtime_lifecycle_log(
            app,
            "runtime.orphan.not-owned",
            json!({
                "pid": pid_file.pid,
                "port": pid_file.port,
                "tokenStatusOk": token_status_ok
            }),
        );
        return Ok(false);
    }
    if !terminate_pid_gracefully(pid_file.pid, Duration::from_secs(2)) {
        return Err(format!(
            "Managed Studio runtime pid {} did not stop cleanly for workspace {}",
            pid_file.pid,
            workspace_root.display()
        ));
    }
    clear_managed_runtime_pid_file(app, Some(pid_file.pid));
    append_runtime_lifecycle_log(
        app,
        "runtime.orphan.replaced",
        json!({
            "pid": pid_file.pid,
            "port": pid_file.port,
            "workspaceRoot": pid_file.workspace_root,
            "runtimeCacheRoot": pid_file.runtime_cache_root
        }),
    );
    Ok(true)
}

fn should_replace_managed_runtime_pid_file(
    pid_file: &ManagedRuntimePidFile,
    process_alive: bool,
    token_status_ok: bool,
) -> bool {
    pid_file.schema_version == 1
        && pid_file.port == STUDIO_RUNTIME_PORT
        && process_alive
        && token_status_ok
}

fn terminate_pid_gracefully(pid: u32, grace_period: Duration) -> bool {
    #[cfg(unix)]
    {
        let _ = send_process_signal(pid, libc::SIGTERM);
        let deadline = Instant::now() + grace_period;
        while Instant::now() < deadline {
            if !process_exists(pid) {
                return true;
            }
            thread::sleep(Duration::from_millis(50));
        }
        let _ = send_process_signal(pid, libc::SIGKILL);
        let deadline = Instant::now() + Duration::from_secs(1);
        while Instant::now() < deadline {
            if !process_exists(pid) {
                return true;
            }
            thread::sleep(Duration::from_millis(50));
        }
        !process_exists(pid)
    }
    #[cfg(not(unix))]
    {
        let _ = (pid, grace_period);
        false
    }
}

fn process_exists(pid: u32) -> bool {
    #[cfg(unix)]
    {
        if pid == 0 {
            return false;
        }
        let result = unsafe { libc::kill(pid as libc::pid_t, 0) };
        if result == 0 {
            return true;
        }
        std::io::Error::last_os_error().raw_os_error() == Some(libc::EPERM)
    }
    #[cfg(not(unix))]
    {
        let _ = pid;
        false
    }
}

#[cfg(unix)]
fn send_process_signal(pid: u32, signal: libc::c_int) -> bool {
    if pid == 0 {
        return false;
    }
    unsafe { libc::kill(pid as libc::pid_t, signal) == 0 }
}

fn resolve_runtime_launch_source(app: &AppHandle) -> Result<RuntimeLaunchSource, String> {
    let package_root = resolve_runtime_package_root(app)?;
    let binary = resolve_runtime_binary(app)?;
    Ok(RuntimeLaunchSource {
        source_kind: runtime_source_kind(app, &binary, &package_root),
        binary,
        package_root,
    })
}

fn runtime_source_kind(app: &AppHandle, binary: &Path, package_root: &Path) -> String {
    if std::env::var_os("MEMOIRE_STUDIO_RUNTIME_BIN").is_some()
        || std::env::var_os("MEMOIRE_STUDIO_RUNTIME_PACKAGE_ROOT").is_some()
    {
        return "env-override".to_string();
    }
    if let Ok(resource_dir) = app.path().resource_dir() {
        if binary.starts_with(&resource_dir) || package_root.starts_with(&resource_dir) {
            return "app-bundle".to_string();
        }
    }
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    if binary.starts_with(&manifest_dir) || package_root.starts_with(&manifest_dir) {
        return "development".to_string();
    }
    "resolved".to_string()
}

fn runtime_cache_root(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_config_dir(app)?.join("runtime"))
}

fn materialize_runtime_for_app(
    app: &AppHandle,
    source: &RuntimeLaunchSource,
) -> Result<MaterializedRuntime, String> {
    let cache_root = runtime_cache_root(app)?;
    materialize_runtime_in_cache(source, &cache_root)
}

fn materialize_runtime_in_cache(
    source: &RuntimeLaunchSource,
    cache_root: &Path,
) -> Result<MaterializedRuntime, String> {
    let (fingerprint, source_signature) = runtime_source_fingerprint_for_cache(source, cache_root)?;
    let materialized = materialized_runtime_from_fingerprint(source, cache_root, &fingerprint);
    let runtime_root = materialized.runtime_root.clone();

    if runtime_cache_is_ready(&materialized.binary, &materialized.package_root) {
        if let Some(signature) = source_signature {
            let _ = upsert_runtime_signature_manifest(cache_root, &signature, &fingerprint);
        }
        let _ = cleanup_runtime_cache(cache_root, Some(&runtime_root));
        return Ok(materialized);
    }

    fs::create_dir_all(cache_root).map_err(|err| {
        format!(
            "Failed to create Studio runtime cache root {}: {err}",
            cache_root.display()
        )
    })?;
    let staging = cache_root.join(format!(
        ".{fingerprint}.staging-{}-{}",
        std::process::id(),
        studio::unix_millis()
    ));
    if staging.exists() {
        fs::remove_dir_all(&staging).map_err(|err| {
            format!(
                "Failed to remove stale Studio runtime cache staging directory {}: {err}",
                staging.display()
            )
        })?;
    }

    let result = (|| {
        let staging_bin = staging.join("bin");
        let staging_package = staging.join("package");
        fs::create_dir_all(&staging_bin).map_err(|err| {
            format!(
                "Failed to create Studio runtime cache staging directory {}: {err}",
                staging_bin.display()
            )
        })?;
        copy_file_with_permissions(
            &source.binary,
            &staging_bin.join(
                source
                    .binary
                    .file_name()
                    .map(|name| name.to_owned())
                    .unwrap_or_else(|| STUDIO_RUNTIME_BIN.into()),
            ),
        )?;
        copy_dir_all(&source.package_root, &staging_package)?;
        write_runtime_cache_manifest(&staging, source, &fingerprint)?;
        if runtime_root.exists() {
            fs::remove_dir_all(&runtime_root).map_err(|err| {
                format!(
                    "Failed to replace existing Studio runtime cache {}: {err}",
                    runtime_root.display()
                )
            })?;
        }
        fs::rename(&staging, &runtime_root).map_err(|err| {
            format!(
                "Failed to activate Studio runtime cache {}: {err}",
                runtime_root.display()
            )
        })?;
        if let Some(signature) = source_signature.as_deref() {
            let _ = upsert_runtime_signature_manifest(cache_root, signature, &fingerprint);
        }
        let _ = cleanup_runtime_cache(cache_root, Some(&runtime_root));
        Ok(materialized)
    })();

    if result.is_err() && staging.exists() {
        let _ = fs::remove_dir_all(&staging);
    }
    result
}

fn materialized_runtime_from_fingerprint(
    source: &RuntimeLaunchSource,
    cache_root: &Path,
    fingerprint: &str,
) -> MaterializedRuntime {
    let runtime_root = cache_root.join(fingerprint);
    let binary_name = source
        .binary
        .file_name()
        .map(|name| name.to_owned())
        .unwrap_or_else(|| STUDIO_RUNTIME_BIN.into());
    MaterializedRuntime {
        binary: runtime_root.join("bin").join(binary_name),
        package_root: runtime_root.join("package"),
        runtime_root,
        source_kind: source.source_kind.clone(),
    }
}

fn runtime_source_fingerprint_for_cache(
    source: &RuntimeLaunchSource,
    cache_root: &Path,
) -> Result<(String, Option<String>), String> {
    let source_signature =
        runtime_source_signature_key(&source.binary, &source.package_root).ok();
    if let Some(signature) = source_signature.as_deref() {
        if let Some(fingerprint) = read_runtime_signature_manifest(cache_root)
            .signatures
            .get(signature)
            .cloned()
        {
            let materialized =
                materialized_runtime_from_fingerprint(source, cache_root, &fingerprint);
            if runtime_cache_is_ready(&materialized.binary, &materialized.package_root) {
                return Ok((fingerprint, source_signature));
            }
        }
    }
    Ok((
        runtime_source_fingerprint(&source.binary, &source.package_root)?,
        source_signature,
    ))
}

fn runtime_source_signature_key(binary: &Path, package_root: &Path) -> Result<String, String> {
    if !binary.is_file() {
        return Err(format!(
            "Studio runtime binary is missing: {}",
            binary.display()
        ));
    }
    if !package_root.join("package.json").is_file() {
        return Err(format!(
            "Studio runtime package root is missing package.json: {}",
            package_root.display()
        ));
    }
    let mut hasher = Sha256::new();
    hasher.update(b"memoire-studio-runtime-source-signature-v1");
    hash_file_metadata(&mut hasher, Path::new("runtime-binary"), binary)?;
    hash_dir_metadata(&mut hasher, package_root, package_root)?;
    Ok(hex_bytes(&hasher.finalize()))
}

fn hash_dir_metadata(hasher: &mut Sha256, base: &Path, dir: &Path) -> Result<(), String> {
    let mut entries = fs::read_dir(dir)
        .map_err(|err| {
            format!(
                "Failed to read Studio runtime resource dir metadata {}: {err}",
                dir.display()
            )
        })?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|err| format!("Failed to read Studio runtime resource metadata entry: {err}"))?;
    entries.sort_by_key(|entry| entry.path());
    for entry in entries {
        let path = entry.path();
        let relative = path.strip_prefix(base).unwrap_or(&path);
        let metadata = fs::symlink_metadata(&path).map_err(|err| {
            format!(
                "Failed to inspect Studio runtime resource metadata {}: {err}",
                path.display()
            )
        })?;
        let file_type = metadata.file_type();
        if file_type.is_symlink() {
            let target = fs::read_link(&path).map_err(|err| {
                format!(
                    "Failed to read Studio runtime resource symlink metadata {}: {err}",
                    path.display()
                )
            })?;
            hasher.update(b"symlink");
            hasher.update(relative.to_string_lossy().as_bytes());
            hasher.update(target.to_string_lossy().as_bytes());
            hasher.update(metadata_millis(&metadata)?.to_le_bytes());
        } else if metadata.is_dir() {
            hasher.update(b"dir");
            hasher.update(relative.to_string_lossy().as_bytes());
            hasher.update(metadata_millis(&metadata)?.to_le_bytes());
            hash_dir_metadata(hasher, base, &path)?;
        } else if metadata.is_file() {
            hash_file_metadata(hasher, relative, &path)?;
        }
    }
    Ok(())
}

fn hash_file_metadata(hasher: &mut Sha256, relative: &Path, path: &Path) -> Result<(), String> {
    let metadata = fs::symlink_metadata(path).map_err(|err| {
        format!(
            "Failed to inspect Studio runtime file metadata {}: {err}",
            path.display()
        )
    })?;
    hasher.update(b"file");
    hasher.update(relative.to_string_lossy().as_bytes());
    hasher.update(metadata.len().to_le_bytes());
    hasher.update(metadata_millis(&metadata)?.to_le_bytes());
    Ok(())
}

fn metadata_millis(metadata: &fs::Metadata) -> Result<u128, String> {
    system_time_millis(
        metadata
            .modified()
            .map_err(|err| format!("Failed to read Studio runtime metadata timestamp: {err}"))?,
    )
}

fn system_time_millis(time: SystemTime) -> Result<u128, String> {
    Ok(time
        .duration_since(UNIX_EPOCH)
        .map_err(|err| format!("Studio runtime metadata timestamp predates Unix epoch: {err}"))?
        .as_millis())
}

fn runtime_signature_manifest_path(cache_root: &Path) -> PathBuf {
    cache_root.join(RUNTIME_SIGNATURE_MANIFEST)
}

fn read_runtime_signature_manifest(cache_root: &Path) -> RuntimeSignatureManifest {
    let path = runtime_signature_manifest_path(cache_root);
    fs::read_to_string(path)
        .ok()
        .and_then(|contents| serde_json::from_str::<RuntimeSignatureManifest>(&contents).ok())
        .filter(|manifest| manifest.schema_version == 1)
        .unwrap_or_else(|| RuntimeSignatureManifest {
            schema_version: 1,
            signatures: BTreeMap::new(),
        })
}

fn upsert_runtime_signature_manifest(
    cache_root: &Path,
    source_signature: &str,
    fingerprint: &str,
) -> Result<(), String> {
    fs::create_dir_all(cache_root).map_err(|err| {
        format!(
            "Failed to create Studio runtime signature cache {}: {err}",
            cache_root.display()
        )
    })?;
    let mut manifest = read_runtime_signature_manifest(cache_root);
    manifest
        .signatures
        .insert(source_signature.to_string(), fingerprint.to_string());
    let path = runtime_signature_manifest_path(cache_root);
    let staging = path.with_extension(format!("json.tmp-{}", std::process::id()));
    fs::write(
        &staging,
        format!(
            "{}\n",
            serde_json::to_string_pretty(&manifest).map_err(|err| err.to_string())?
        ),
    )
    .map_err(|err| {
        format!(
            "Failed to write Studio runtime signature manifest {}: {err}",
            staging.display()
        )
    })?;
    fs::rename(&staging, &path).map_err(|err| {
        let _ = fs::remove_file(&staging);
        format!(
            "Failed to activate Studio runtime signature manifest {}: {err}",
            path.display()
        )
    })
}

fn runtime_cache_is_ready(binary: &Path, package_root: &Path) -> bool {
    binary.is_file() && package_root.join("package.json").is_file()
}

fn runtime_source_fingerprint(binary: &Path, package_root: &Path) -> Result<String, String> {
    if !binary.is_file() {
        return Err(format!(
            "Studio runtime binary is missing: {}",
            binary.display()
        ));
    }
    if !package_root.join("package.json").is_file() {
        return Err(format!(
            "Studio runtime package root is missing package.json: {}",
            package_root.display()
        ));
    }
    let mut hasher = Sha256::new();
    hasher.update(b"memoire-studio-runtime-cache-v1");
    hash_file(&mut hasher, Path::new("runtime-binary"), binary)?;
    hash_dir(&mut hasher, package_root, package_root)?;
    Ok(hex_bytes(&hasher.finalize()))
}

fn hash_dir(hasher: &mut Sha256, base: &Path, dir: &Path) -> Result<(), String> {
    let mut entries = fs::read_dir(dir)
        .map_err(|err| {
            format!(
                "Failed to read Studio runtime resource dir {}: {err}",
                dir.display()
            )
        })?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|err| format!("Failed to read Studio runtime resource entry: {err}"))?;
    entries.sort_by_key(|entry| entry.path());
    for entry in entries {
        let path = entry.path();
        let relative = path.strip_prefix(base).unwrap_or(&path);
        let metadata = fs::symlink_metadata(&path).map_err(|err| {
            format!(
                "Failed to inspect Studio runtime resource {}: {err}",
                path.display()
            )
        })?;
        let file_type = metadata.file_type();
        if file_type.is_symlink() {
            let target = fs::read_link(&path).map_err(|err| {
                format!(
                    "Failed to read Studio runtime resource symlink {}: {err}",
                    path.display()
                )
            })?;
            hasher.update(b"symlink");
            hasher.update(relative.to_string_lossy().as_bytes());
            hasher.update(target.to_string_lossy().as_bytes());
        } else if metadata.is_dir() {
            hasher.update(b"dir");
            hasher.update(relative.to_string_lossy().as_bytes());
            hash_dir(hasher, base, &path)?;
        } else if metadata.is_file() {
            hash_file(hasher, relative, &path)?;
        }
    }
    Ok(())
}

fn hash_file(hasher: &mut Sha256, relative: &Path, path: &Path) -> Result<(), String> {
    let mut file = fs::File::open(path).map_err(|err| {
        format!(
            "Failed to read Studio runtime file for fingerprint {}: {err}",
            path.display()
        )
    })?;
    hasher.update(b"file");
    hasher.update(relative.to_string_lossy().as_bytes());
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let read = file.read(&mut buffer).map_err(|err| {
            format!(
                "Failed to hash Studio runtime file {}: {err}",
                path.display()
            )
        })?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(())
}

fn copy_dir_all(source: &Path, target: &Path) -> Result<(), String> {
    fs::create_dir_all(target).map_err(|err| {
        format!(
            "Failed to create Studio runtime resource cache {}: {err}",
            target.display()
        )
    })?;
    let mut entries = fs::read_dir(source)
        .map_err(|err| {
            format!(
                "Failed to read Studio runtime resources {}: {err}",
                source.display()
            )
        })?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|err| format!("Failed to read Studio runtime resource entry: {err}"))?;
    entries.sort_by_key(|entry| entry.path());
    for entry in entries {
        let source_path = entry.path();
        let target_path = target.join(entry.file_name());
        let metadata = fs::symlink_metadata(&source_path).map_err(|err| {
            format!(
                "Failed to inspect Studio runtime resource {}: {err}",
                source_path.display()
            )
        })?;
        let file_type = metadata.file_type();
        if file_type.is_symlink() {
            copy_symlink(&source_path, &target_path)?;
        } else if metadata.is_dir() {
            copy_dir_all(&source_path, &target_path)?;
        } else if metadata.is_file() {
            copy_file_with_permissions(&source_path, &target_path)?;
        }
    }
    Ok(())
}

fn copy_file_with_permissions(source: &Path, target: &Path) -> Result<(), String> {
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|err| {
            format!(
                "Failed to create Studio runtime cache directory {}: {err}",
                parent.display()
            )
        })?;
    }
    fs::copy(source, target).map_err(|err| {
        format!(
            "Failed to copy Studio runtime file {} to {}: {err}",
            source.display(),
            target.display()
        )
    })?;
    let permissions = fs::metadata(source)
        .map_err(|err| {
            format!(
                "Failed to read Studio runtime file permissions {}: {err}",
                source.display()
            )
        })?
        .permissions();
    fs::set_permissions(target, permissions).map_err(|err| {
        format!(
            "Failed to set Studio runtime file permissions {}: {err}",
            target.display()
        )
    })?;
    #[cfg(unix)]
    {
        let mode = fs::metadata(source)
            .map_err(|err| {
                format!(
                    "Failed to read Studio runtime file mode {}: {err}",
                    source.display()
                )
            })?
            .permissions()
            .mode();
        fs::set_permissions(target, fs::Permissions::from_mode(mode)).map_err(|err| {
            format!(
                "Failed to set Studio runtime file mode {}: {err}",
                target.display()
            )
        })?;
    }
    Ok(())
}

#[cfg(unix)]
fn copy_symlink(source: &Path, target: &Path) -> Result<(), String> {
    let link_target = fs::read_link(source).map_err(|err| {
        format!(
            "Failed to read Studio runtime symlink {}: {err}",
            source.display()
        )
    })?;
    std::os::unix::fs::symlink(&link_target, target).map_err(|err| {
        format!(
            "Failed to copy Studio runtime symlink {} to {}: {err}",
            source.display(),
            target.display()
        )
    })
}

#[cfg(not(unix))]
fn copy_symlink(source: &Path, _target: &Path) -> Result<(), String> {
    Err(format!(
        "Studio runtime cache cannot copy symlink on this platform: {}",
        source.display()
    ))
}

fn write_runtime_cache_manifest(
    runtime_root: &Path,
    source: &RuntimeLaunchSource,
    fingerprint: &str,
) -> Result<(), String> {
    let manifest = json!({
        "schemaVersion": 1,
        "fingerprint": fingerprint,
        "sourceKind": source.source_kind,
        "sourceBinary": source.binary.to_string_lossy().to_string(),
        "sourcePackageRoot": source.package_root.to_string_lossy().to_string(),
        "createdAt": studio::unix_millis().to_string()
    });
    fs::write(
        runtime_root.join("runtime-cache.json"),
        format!(
            "{}\n",
            serde_json::to_string_pretty(&manifest).map_err(|err| err.to_string())?
        ),
    )
    .map_err(|err| {
        format!(
            "Failed to write Studio runtime cache manifest {}: {err}",
            runtime_root.display()
        )
    })
}

fn cleanup_runtime_cache(cache_root: &Path, active_runtime_root: Option<&Path>) -> Result<(), String> {
    if !cache_root.is_dir() {
        return Ok(());
    }
    let active_runtime_root = active_runtime_root.and_then(|path| path.canonicalize().ok());
    let mut inactive_caches = Vec::new();
    for entry in fs::read_dir(cache_root).map_err(|err| {
        format!(
            "Failed to read Studio runtime cache root {}: {err}",
            cache_root.display()
        )
    })? {
        let entry = entry.map_err(|err| format!("Failed to read Studio runtime cache entry: {err}"))?;
        let path = entry.path();
        let file_name = entry.file_name().to_string_lossy().to_string();
        if file_name.starts_with('.') && file_name.contains(".staging-") {
            let _ = fs::remove_dir_all(&path);
            continue;
        }
        if !path.is_dir() || !path.join("runtime-cache.json").is_file() {
            continue;
        }
        if active_runtime_root
            .as_ref()
            .is_some_and(|active| path.canonicalize().ok().as_ref() == Some(active))
        {
            continue;
        }
        inactive_caches.push((runtime_cache_created_at(&path), path));
    }
    inactive_caches.sort_by(|(left_created_at, _), (right_created_at, _)| {
        right_created_at.cmp(left_created_at)
    });
    for (_, path) in inactive_caches.into_iter().skip(2) {
        let _ = fs::remove_dir_all(path);
    }
    Ok(())
}

fn runtime_cache_created_at(runtime_root: &Path) -> u128 {
    fs::read_to_string(runtime_root.join("runtime-cache.json"))
        .ok()
        .and_then(|contents| serde_json::from_str::<Value>(&contents).ok())
        .and_then(|manifest| {
            manifest
                .get("createdAt")
                .and_then(Value::as_str)
                .and_then(|value| value.parse::<u128>().ok())
        })
        .unwrap_or_else(|| {
            fs::metadata(runtime_root)
                .and_then(|metadata| metadata.modified())
                .ok()
                .and_then(|modified| system_time_millis(modified).ok())
                .unwrap_or(0)
        })
}

fn resolve_runtime_binary(app: &AppHandle) -> Result<PathBuf, String> {
    if let Ok(path) = std::env::var("MEMOIRE_STUDIO_RUNTIME_BIN") {
        let path = PathBuf::from(path);
        if path.is_file() {
            return Ok(path);
        }
    }

    let executable = format!("{STUDIO_RUNTIME_BIN}{}", std::env::consts::EXE_SUFFIX);
    let mut candidates = Vec::new();
    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(dir) = current_exe.parent() {
            candidates.push(dir.join(&executable));
            candidates.push(dir.join("binaries").join(&executable));
        }
    }
    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join(&executable));
        candidates.push(resource_dir.join("binaries").join(&executable));
    }

    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let profile = if cfg!(debug_assertions) {
        "debug"
    } else {
        "release"
    };
    candidates.push(manifest_dir.join("target").join(profile).join(&executable));
    if let Some(target_triple) = option_env!("TAURI_ENV_TARGET_TRIPLE") {
        candidates.push(manifest_dir.join("binaries").join(format!(
            "{STUDIO_RUNTIME_BIN}-{target_triple}{}",
            std::env::consts::EXE_SUFFIX
        )));
    }

    candidates
        .into_iter()
        .find(|path| path.is_file())
        .ok_or_else(|| {
            "Bundled Studio runtime is missing. Run `node scripts/build-studio-runtime.mjs --target=darwin-arm64` before building the app.".to_string()
        })
}

fn resolve_runtime_package_root(app: &AppHandle) -> Result<PathBuf, String> {
    if let Ok(path) = std::env::var("MEMOIRE_STUDIO_RUNTIME_PACKAGE_ROOT") {
        let path = PathBuf::from(path);
        if path.is_dir() {
            return Ok(path);
        }
    }

    let mut candidates = Vec::new();
    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join(STUDIO_RUNTIME_RESOURCE_DIR));
        candidates.push(resource_dir.join("memoire-runtime"));
        candidates.push(resource_dir);
    }

    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    candidates.push(manifest_dir.join("resources").join("memoire-runtime"));
    candidates.push(manifest_dir.join("resources"));
    candidates.push(manifest_dir.join(".."));

    if let Some(path) = candidates
        .into_iter()
        .find(|candidate| candidate.join("package.json").is_file())
    {
        return Ok(path);
    }

    Err("Bundled Studio runtime resources are missing. Run `node scripts/build-studio-runtime.mjs --target=darwin-arm64` before building the app.".to_string())
}

fn local_port_open(port: u16) -> bool {
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    TcpStream::connect_timeout(&addr, Duration::from_millis(120)).is_ok()
}

fn runtime_answers_status(port: u16) -> bool {
    matches!(local_http_get(port, "/api/status"), Some((200, _)))
}

fn runtime_harnesses(api_token: Option<&str>) -> Option<Vec<studio::HarnessStatus>> {
    let Some((200, body)) =
        local_http_get_with_token(STUDIO_RUNTIME_PORT, "/api/harnesses?refresh=1", api_token)
    else {
        return None;
    };
    serde_json::from_str::<RuntimeHarnessesPayload>(&body)
        .ok()
        .map(|payload| payload.harnesses)
}

fn local_http_get(port: u16, path: &str) -> Option<(u16, String)> {
    local_http_get_with_token(port, path, None)
}

fn local_http_get_with_token(
    port: u16,
    path: &str,
    api_token: Option<&str>,
) -> Option<(u16, String)> {
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let mut stream = TcpStream::connect_timeout(&addr, Duration::from_millis(200)).ok()?;
    stream.set_read_timeout(Some(Duration::from_millis(500))).ok()?;
    stream.set_write_timeout(Some(Duration::from_millis(500))).ok()?;
    let token_header = api_token
        .map(|token| format!("x-memoire-studio-token: {token}\r\n"))
        .unwrap_or_default();
    let request = format!(
        "GET {path} HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\n{token_header}Connection: close\r\n\r\n"
    );
    stream.write_all(request.as_bytes()).ok()?;
    let mut response = String::new();
    stream.read_to_string(&mut response).ok()?;
    let status = response
        .lines()
        .next()
        .and_then(|line| line.split_whitespace().nth(1))
        .and_then(|code| code.parse::<u16>().ok())?;
    let body = response
        .split_once("\r\n\r\n")
        .map(|(_, body)| body.to_string())
        .unwrap_or_default();
    Some((status, body))
}

#[tauri::command]
fn setup_markdown_corpus(
    app: AppHandle,
    state: State<AppState>,
    catalog: Option<Vec<markdown_corpus::CorpusRepo>>,
) -> Result<markdown_corpus::CorpusStatus, String> {
    let repos = catalog.unwrap_or_else(markdown_corpus::default_corpus_catalog);
    let root = studio::current_dir();
    state.markdown_corpus_cancel.store(false, Ordering::Relaxed);
    let _ = app.emit(
        "markdown-corpus-event",
        serde_json::json!({ "status": "downloading", "repos": repos.len() }),
    );
    let status = markdown_corpus::setup_markdown_corpus_at_with_cancel(
        &root,
        &repos,
        &state.markdown_corpus_cancel,
    )?;
    let _ = app.emit("markdown-corpus-event", &status);
    Ok(status)
}

#[tauri::command]
fn cancel_markdown_corpus_setup(state: State<AppState>) -> Result<bool, String> {
    state.markdown_corpus_cancel.store(true, Ordering::Relaxed);
    Ok(true)
}

#[tauri::command]
fn get_markdown_corpus_status() -> Result<markdown_corpus::CorpusStatus, String> {
    markdown_corpus::get_markdown_corpus_status_at(&studio::current_dir())
}

#[tauri::command]
fn analyze_markdown_for_fig_jam(path: String) -> Result<markdown_corpus::MarkdownAnalysisReport, String> {
    markdown_corpus::analyze_markdown_file(&PathBuf::from(path))
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AppState::default())
        .setup(|app| {
            match load_or_create_desktop_app_config(app.handle()) {
                Ok(config) => {
                    let state = app.state::<AppState>();
                    reset_runtime_restart_attempts(&state);
                    let status = request_studio_runtime_restart(
                        app.handle(),
                        &state,
                        Path::new(&config.workspace_root),
                    );
                    if status.error.is_some() {
                        let _ = app.emit(
                            "studio-runtime-log",
                            json!({ "stream": "system", "message": status.error }),
                        );
                    }
                }
                Err(error) => {
                    let _ = app.emit(
                        "studio-runtime-log",
                        json!({ "stream": "system", "message": error }),
                    );
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            studio_status,
            studio_runtime_status,
            restart_studio_runtime,
            load_app_config,
            save_app_config,
            select_workspace,
            open_workspace,
            create_workspace,
            list_recent_workspaces,
            agent_install,
            capture_attachment,
            get_attachment,
            setup_markdown_corpus,
            cancel_markdown_corpus_setup,
            get_markdown_corpus_status,
            analyze_markdown_for_fig_jam
        ])
        .on_window_event(|window, event| {
            if matches!(event, WindowEvent::CloseRequested { .. }) {
                if let Some(state) = window.try_state::<AppState>() {
                    stop_studio_runtime(window.app_handle(), &state);
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building Mémoire Studio")
        .run(|app, event| {
            if matches!(
                event,
                tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit
            ) {
                if let Some(state) = app.try_state::<AppState>() {
                    stop_studio_runtime(app, &state);
                }
            }
        });
}

fn spawn_runtime_reader<R: std::io::Read + Send + 'static>(
    app: AppHandle,
    stream: &'static str,
    output: R,
) {
    thread::spawn(move || {
        let reader = BufReader::new(output);
        for line in reader.lines().map_while(Result::ok) {
            let _ = app.emit(
                "studio-runtime-log",
                json!({
                    "stream": stream,
                    "message": studio::redact_secrets(&line),
                    "timestamp": studio::unix_millis().to_string()
                }),
            );
        }
    });
}

fn spawn_runtime_ready_watcher(
    app: AppHandle,
    child: Arc<Mutex<std::process::Child>>,
    workspace_root: PathBuf,
    runtime_launch: MaterializedRuntime,
    api_token: Option<String>,
    timing: RuntimeSupervisorTiming,
) {
    let pid = child.lock().map(|child| child.id()).unwrap_or_default();
    thread::spawn(move || {
        for _ in 0..RUNTIME_STARTUP_POLL_ATTEMPTS {
            if runtime_answers_status(STUDIO_RUNTIME_PORT) {
                if let Some(state) = app.try_state::<AppState>() {
                    let mut ready_payload = None;
                    {
                        let mut runtime_state = state.runtime.lock().expect("runtime state lock");
                        let current_pid = runtime_state
                            .child
                            .as_ref()
                            .and_then(|current| current.lock().ok().map(|child| child.id()));
                        if runtime_state.generation == timing.generation && current_pid == Some(pid) {
                            let mut status = runtime_status(
                                "running",
                                Some(pid),
                                &workspace_root,
                                api_token.clone(),
                                Some(runtime_launch.package_root.to_string_lossy().to_string()),
                                None,
                            );
                            apply_runtime_diagnostics(&mut status, &runtime_launch);
                            status.supervisor_phase = Some("running".to_string());
                            status.startup_started_at = Some(timing.startup_started_at.clone());
                            status.cache_prepare_ms = Some(timing.cache_prepare_ms);
                            status.startup_ms = Some(elapsed_ms(timing.supervisor_started));
                            ready_payload = Some(json!({
                                "generation": timing.generation,
                                "pid": pid,
                                "runtimeCacheRoot": status.runtime_cache_root.clone(),
                                "cachePrepareMs": status.cache_prepare_ms,
                                "startupMs": status.startup_ms
                            }));
                            runtime_state.status = Some(status);
                        }
                    }
                    if let Some(payload) = ready_payload {
                        append_runtime_lifecycle_log(&app, "runtime.ready", payload);
                    }
                }
                return;
            }
            thread::sleep(Duration::from_millis(250));
        }

        if let Some(state) = app.try_state::<AppState>() {
            let status = runtime_status(
                "error",
                None,
                &workspace_root,
                api_token,
                Some(runtime_launch.package_root.to_string_lossy().to_string()),
                Some("Studio runtime started but did not answer /api/status.".to_string()),
            );
            let mut status = status;
            apply_runtime_diagnostics(&mut status, &runtime_launch);
            status.supervisor_phase = Some("status-timeout".to_string());
            status.startup_started_at = Some(timing.startup_started_at.clone());
            status.cache_prepare_ms = Some(timing.cache_prepare_ms);
            status.startup_ms = Some(elapsed_ms(timing.supervisor_started));
            let mut runtime_state = state.runtime.lock().expect("runtime state lock");
            let current_pid = runtime_state
                .child
                .as_ref()
                .and_then(|current| current.lock().ok().map(|child| child.id()));
            if runtime_state.generation == timing.generation && current_pid == Some(pid) {
                runtime_state.status = Some(status.clone());
            }
            drop(runtime_state);
            append_runtime_lifecycle_log(
                &app,
                "runtime.status-timeout",
                json!({
                    "generation": timing.generation,
                    "pid": pid,
                    "runtimeCacheRoot": status.runtime_cache_root.clone(),
                    "cachePrepareMs": status.cache_prepare_ms,
                    "startupMs": status.startup_ms,
                    "error": status.error.clone()
                }),
            );
            let _ = app.emit(
                "studio-runtime-log",
                json!({ "stream": "system", "message": status.error }),
            );
        }
    });
}

fn spawn_runtime_waiter(
    app: AppHandle,
    child: Arc<Mutex<std::process::Child>>,
    workspace_root: PathBuf,
    runtime_launch: MaterializedRuntime,
    api_token: Option<String>,
    generation: u64,
) {
    let pid = child.lock().map(|child| child.id()).unwrap_or_default();
    thread::spawn(move || loop {
        let exit = {
            let mut child = match child.lock() {
                Ok(child) => child,
                Err(_) => return,
            };
            child.try_wait()
        };

        match exit {
            Ok(Some(status)) => {
                if let Some(state) = app.try_state::<AppState>() {
                    let mut should_restart = false;
                    let mut clear_pid_file = false;
                    let mut runtime_status = runtime_status(
                        if status.success() { "stopped" } else { "error" },
                        None,
                        &workspace_root,
                        api_token.clone(),
                        Some(runtime_launch.package_root.to_string_lossy().to_string()),
                        if status.success() {
                            None
                        } else {
                            Some(format!(
                                "Studio runtime exited with code {:?}",
                                status.code()
                            ))
                        },
                    );
                    apply_runtime_diagnostics(&mut runtime_status, &runtime_launch);
                    let mut runtime = state.runtime.lock().expect("runtime state lock");
                    let current_pid = runtime
                        .child
                        .as_ref()
                        .and_then(|current| current.lock().ok().map(|child| child.id()));
                    if runtime.generation == generation && current_pid == Some(pid) {
                        runtime.child = None;
                        runtime.status = Some(runtime_status.clone());
                        clear_pid_file = true;
                        should_restart = !status.success() && should_restart_managed_runtime(&state);
                    }
                    drop(runtime);
                    if clear_pid_file {
                        clear_managed_runtime_pid_file(&app, Some(pid));
                    }
                    append_runtime_lifecycle_log(
                        &app,
                        "runtime.exit",
                        json!({
                            "generation": generation,
                            "pid": pid,
                            "success": status.success(),
                            "code": status.code(),
                            "shouldRestart": should_restart
                        }),
                    );
                    let _ = app.emit(
                        "studio-runtime-log",
                        json!({ "stream": "system", "message": runtime_status.error }),
                    );
                    if should_restart {
                        let _ = app.emit(
                            "studio-runtime-log",
                            json!({ "stream": "system", "message": "Restarting Studio runtime after unexpected exit." }),
                        );
                        request_studio_runtime_restart(&app, &state, &workspace_root);
                    }
                }
                return;
            }
            Ok(None) => thread::sleep(Duration::from_millis(250)),
            Err(error) => {
                if let Some(state) = app.try_state::<AppState>() {
                    let status = runtime_status(
                        "error",
                        None,
                        &workspace_root,
                        api_token.clone(),
                        Some(runtime_launch.package_root.to_string_lossy().to_string()),
                        Some(format!("Studio runtime status check failed: {error}")),
                    );
                    let mut status = status;
                    apply_runtime_diagnostics(&mut status, &runtime_launch);
                    let _ = set_runtime_status_for_generation(&state, status, None, generation);
                }
                return;
            }
        }
    });
}

fn reset_runtime_restart_attempts(state: &AppState) {
    if let Ok(mut attempts) = state.runtime_restart_attempts.lock() {
        *attempts = 0;
    }
}

fn should_restart_managed_runtime(state: &AppState) -> bool {
    let Ok(mut attempts) = state.runtime_restart_attempts.lock() else {
        return false;
    };
    if *attempts >= MAX_MANAGED_RUNTIME_RESTARTS {
        return false;
    }
    *attempts += 1;
    true
}

#[cfg(test)]
mod runtime_cache_tests {
    use super::*;
    use std::{env, path::Path};

    fn temp_runtime_dir(name: &str) -> PathBuf {
        let root = env::temp_dir().join(format!(
            "memoire-studio-{name}-{}-{}",
            std::process::id(),
            studio::unix_millis()
        ));
        fs::create_dir_all(&root).expect("create temp runtime dir");
        root
    }

    fn write_file(path: &Path, contents: &str) {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).expect("create parent dir");
        }
        fs::write(path, contents).expect("write test file");
    }

    fn write_cache_dir(root: &Path, name: &str, created_at: u128) -> PathBuf {
        let dir = root.join(name);
        fs::create_dir_all(&dir).expect("create runtime cache dir");
        write_file(
            &dir.join("runtime-cache.json"),
            &format!(r#"{{"createdAt":"{created_at}"}}"#),
        );
        dir
    }

    fn runtime_source(root: &Path) -> RuntimeLaunchSource {
        let binary = root.join("memi-studio-runtime");
        let package_root = root.join("package");
        write_file(&binary, "#!/bin/sh\necho runtime\n");
        write_file(
            &package_root.join("package.json"),
            "{\"name\":\"runtime\"}\n",
        );
        write_file(
            &package_root.join("skills").join("SUPERPOWER.md"),
            "ship it\n",
        );
        RuntimeLaunchSource {
            binary,
            package_root,
            source_kind: "test".to_string(),
        }
    }

    #[test]
    fn runtime_fingerprint_changes_when_binary_or_resources_change() {
        let root = temp_runtime_dir("fingerprint");
        let source = runtime_source(&root);

        let first = runtime_source_fingerprint(&source.binary, &source.package_root)
            .expect("first fingerprint");
        write_file(
            &source.package_root.join("skills").join("SUPERPOWER.md"),
            "ship it harder\n",
        );
        let resource_changed = runtime_source_fingerprint(&source.binary, &source.package_root)
            .expect("resource fingerprint");
        write_file(&source.binary, "#!/bin/sh\necho runtime v2\n");
        let binary_changed = runtime_source_fingerprint(&source.binary, &source.package_root)
            .expect("binary fingerprint");

        assert_ne!(first, resource_changed);
        assert_ne!(resource_changed, binary_changed);
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn materialized_runtime_uses_cache_paths_not_source_paths() {
        let root = temp_runtime_dir("materialize");
        let cache_root = temp_runtime_dir("runtime-cache");
        let source = runtime_source(&root);

        let materialized =
            materialize_runtime_in_cache(&source, &cache_root).expect("materialize runtime");
        let second =
            materialize_runtime_in_cache(&source, &cache_root).expect("reuse cached runtime");

        assert!(materialized.binary.starts_with(&cache_root));
        assert!(materialized.package_root.starts_with(&cache_root));
        assert_ne!(materialized.binary, source.binary);
        assert_ne!(materialized.package_root, source.package_root);
        assert_eq!(materialized.source_kind, "test");
        assert_eq!(materialized.binary, second.binary);
        assert_eq!(materialized.package_root, second.package_root);
        assert!(materialized.package_root.join("package.json").is_file());
        let _ = fs::remove_dir_all(root);
        let _ = fs::remove_dir_all(cache_root);
    }

    #[test]
    fn materialization_failure_removes_atomic_staging_dir() {
        let root = temp_runtime_dir("materialize-failure");
        let cache_root = temp_runtime_dir("runtime-cache-failure");
        let source = runtime_source(&root);
        let fingerprint =
            runtime_source_fingerprint(&source.binary, &source.package_root).expect("fingerprint");
        fs::write(cache_root.join(&fingerprint), "not a runtime directory")
            .expect("create invalid cache conflict");

        let error = materialize_runtime_in_cache(&source, &cache_root)
            .expect_err("invalid cache conflict should fail");
        let leaked_staging = fs::read_dir(&cache_root)
            .expect("read cache root")
            .filter_map(Result::ok)
            .map(|entry| entry.file_name().to_string_lossy().to_string())
            .any(|name| name.starts_with(&format!(".{fingerprint}.staging")));

        assert!(error.contains("runtime cache"));
        assert!(!leaked_staging);
        let _ = fs::remove_dir_all(root);
        let _ = fs::remove_dir_all(cache_root);
    }

    #[test]
    fn stop_runtime_takes_child_and_releases_state_lock_before_waiting() {
        let state = AppState::default();
        {
            let mut runtime = state.runtime.lock().expect("runtime lock");
            runtime.status = Some(runtime_status(
                "running",
                Some(123),
                Path::new("/tmp/memoire-workspace"),
                Some("token".to_string()),
                Some("/tmp/memoire-package".to_string()),
                None,
            ));
        }

        let child = take_runtime_child_for_stop(&state);
        let runtime = state
            .runtime
            .try_lock()
            .expect("runtime lock should be released before process wait");

        assert!(child.is_none());
        assert_eq!(
            runtime.status.as_ref().map(|status| status.status.as_str()),
            Some("stopping")
        );
    }

    #[test]
    fn runtime_supervisor_generation_rejects_stale_status_updates() {
        let state = AppState::default();
        let first = begin_runtime_supervisor(
            &state,
            runtime_status(
                "starting",
                None,
                Path::new("/tmp/first-workspace"),
                None,
                None,
                None,
            ),
        );
        let second = begin_runtime_supervisor(
            &state,
            runtime_status(
                "starting",
                None,
                Path::new("/tmp/second-workspace"),
                None,
                None,
                None,
            ),
        );

        let stale_status = runtime_status(
            "error",
            None,
            Path::new("/tmp/first-workspace"),
            None,
            None,
            Some("stale launch failed".to_string()),
        );
        let current_status = runtime_status(
            "running",
            None,
            Path::new("/tmp/second-workspace"),
            None,
            None,
            None,
        );

        assert!(second > first);
        assert!(!set_runtime_status_for_generation(
            &state,
            stale_status,
            None,
            first
        ));
        assert!(set_runtime_status_for_generation(
            &state,
            current_status,
            None,
            second
        ));
        assert_eq!(
            state
                .runtime
                .lock()
                .expect("runtime lock")
                .status
                .as_ref()
                .map(|status| status.workspace_root.as_str()),
            Some("/tmp/second-workspace")
        );
    }

    #[test]
    fn managed_runtime_pid_file_round_trips_and_clears_only_matching_pid() {
        let root = temp_runtime_dir("managed-pid");
        let path = managed_runtime_pid_file_path_for_cache_root(&root);
        let pid_file = ManagedRuntimePidFile {
            schema_version: 1,
            pid: 12345,
            port: STUDIO_RUNTIME_PORT,
            api_token: "token".to_string(),
            workspace_root: "/tmp/workspace".to_string(),
            package_root: "/tmp/runtime/package".to_string(),
            runtime_binary: "/tmp/runtime/bin/memi-studio-runtime".to_string(),
            runtime_cache_root: "/tmp/runtime".to_string(),
            started_at: "1".to_string(),
        };

        write_managed_runtime_pid_file_at(&path, &pid_file).expect("write pid file");
        assert_eq!(read_managed_runtime_pid_file_at(&path), Some(pid_file.clone()));

        clear_managed_runtime_pid_file_at(&path, Some(67890));
        assert!(path.is_file());
        clear_managed_runtime_pid_file_at(&path, Some(12345));
        assert!(!path.exists());
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn managed_runtime_replacement_requires_live_owned_runtime() {
        let pid_file = ManagedRuntimePidFile {
            schema_version: 1,
            pid: 12345,
            port: STUDIO_RUNTIME_PORT,
            api_token: "token".to_string(),
            workspace_root: "/tmp/workspace".to_string(),
            package_root: "/tmp/runtime/package".to_string(),
            runtime_binary: "/tmp/runtime/bin/memi-studio-runtime".to_string(),
            runtime_cache_root: "/tmp/runtime".to_string(),
            started_at: "1".to_string(),
        };
        let wrong_port = ManagedRuntimePidFile {
            port: STUDIO_RUNTIME_PORT + 1,
            ..pid_file.clone()
        };

        assert!(should_replace_managed_runtime_pid_file(&pid_file, true, true));
        assert!(!should_replace_managed_runtime_pid_file(&pid_file, false, true));
        assert!(!should_replace_managed_runtime_pid_file(&pid_file, true, false));
        assert!(!should_replace_managed_runtime_pid_file(&wrong_port, true, true));
    }

    #[test]
    fn source_signature_manifest_reuses_ready_cache_fingerprint() {
        let root = temp_runtime_dir("signature-reuse");
        let cache_root = temp_runtime_dir("signature-cache");
        let source = runtime_source(&root);

        let materialized =
            materialize_runtime_in_cache(&source, &cache_root).expect("materialize runtime");
        let (fingerprint, source_signature) =
            runtime_source_fingerprint_for_cache(&source, &cache_root).expect("fingerprint");

        assert_eq!(materialized.runtime_root, cache_root.join(&fingerprint));
        assert_eq!(
            source_signature,
            Some(
                runtime_source_signature_key(&source.binary, &source.package_root)
                    .expect("source signature")
            )
        );
        let _ = fs::remove_dir_all(root);
        let _ = fs::remove_dir_all(cache_root);
    }

    #[test]
    fn source_signature_changes_when_resource_metadata_changes() {
        let root = temp_runtime_dir("signature-change");
        let source = runtime_source(&root);

        let first = runtime_source_signature_key(&source.binary, &source.package_root)
            .expect("first signature");
        write_file(
            &source.package_root.join("skills").join("SUPERPOWER.md"),
            "ship it much harder\n",
        );
        let second = runtime_source_signature_key(&source.binary, &source.package_root)
            .expect("second signature");

        assert_ne!(first, second);
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn cleanup_runtime_cache_preserves_active_and_two_newest_inactive_caches() {
        let cache_root = temp_runtime_dir("cache-cleanup");
        let active = write_cache_dir(&cache_root, "active", 1);
        let old = write_cache_dir(&cache_root, "old", 2);
        let newest = write_cache_dir(&cache_root, "newest", 4);
        let second_newest = write_cache_dir(&cache_root, "second-newest", 3);

        cleanup_runtime_cache(&cache_root, Some(&active)).expect("cleanup cache");

        assert!(active.exists());
        assert!(newest.exists());
        assert!(second_newest.exists());
        assert!(!old.exists());
        let _ = fs::remove_dir_all(cache_root);
    }

    #[test]
    fn cleanup_runtime_cache_removes_stale_staging_dirs() {
        let cache_root = temp_runtime_dir("cache-staging-cleanup");
        let staging = cache_root.join(".abc.staging-1-2");
        fs::create_dir_all(&staging).expect("create staging dir");

        cleanup_runtime_cache(&cache_root, None).expect("cleanup staging");

        assert!(!staging.exists());
        let _ = fs::remove_dir_all(cache_root);
    }

    #[test]
    fn lifecycle_log_writes_jsonl_entries_without_runtime_tokens() {
        let root = temp_runtime_dir("lifecycle-log");
        let path = root.join("runtime").join("lifecycle.jsonl");

        append_runtime_lifecycle_log_at(
            &path,
            "runtime.cache-prepared",
            json!({
                "pid": 123,
                "runtimeCacheRoot": "/tmp/runtime-cache"
            }),
        )
        .expect("write lifecycle log");

        let contents = fs::read_to_string(&path).expect("read lifecycle log");
        let line = contents.lines().next().expect("first lifecycle line");
        let entry: Value = serde_json::from_str(line).expect("parse lifecycle log entry");
        assert_eq!(entry.get("event").and_then(Value::as_str), Some("runtime.cache-prepared"));
        assert!(entry.get("payload").and_then(|payload| payload.get("apiToken")).is_none());
        let _ = fs::remove_dir_all(root);
    }
}

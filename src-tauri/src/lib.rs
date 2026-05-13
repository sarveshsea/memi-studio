// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

pub mod markdown_corpus;
mod studio;

use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
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
    time::Duration,
};
use tauri::{AppHandle, Emitter, Manager, State, WindowEvent};
use tauri_plugin_dialog::DialogExt;

const STUDIO_RUNTIME_PORT: u16 = 8765;
const STUDIO_RUNTIME_BIN: &str = "memi-studio-runtime";
const STUDIO_RUNTIME_RESOURCE_DIR: &str = "resources/memoire-runtime";
const RUNTIME_STARTUP_POLL_ATTEMPTS: usize = 40;
const MAX_MANAGED_RUNTIME_RESTARTS: u8 = 1;

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
    restart_studio_runtime_process(app, state, workspace_root)
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
        restart_studio_runtime_process(&app, &state, Path::new(&next.workspace_root));
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

fn restart_studio_runtime_process(
    app: &AppHandle,
    state: &AppState,
    workspace_root: &Path,
) -> studio::StudioRuntimeStatus {
    {
        let mut runtime = state.runtime.lock().expect("runtime state lock");
        stop_runtime_locked(&mut runtime);
    }

    for _ in 0..20 {
        if !local_port_open(STUDIO_RUNTIME_PORT) {
            break;
        }
        thread::sleep(Duration::from_millis(100));
    }

    if local_port_open(STUDIO_RUNTIME_PORT) {
        if runtime_answers_status(STUDIO_RUNTIME_PORT) {
            let status = runtime_status(
                "running",
                None,
                workspace_root,
                None,
                None,
                None,
            );
            set_runtime_status(state, status.clone(), None);
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
        set_runtime_status(state, status.clone(), None);
        return status;
    }

    let package_root = match resolve_runtime_package_root(app) {
        Ok(path) => path,
        Err(error) => {
            let status = runtime_status("error", None, workspace_root, None, None, Some(error));
            set_runtime_status(state, status.clone(), None);
            return status;
        }
    };
    let binary = match resolve_runtime_binary(app) {
        Ok(path) => path,
        Err(error) => {
            let status = runtime_status(
                "error",
                None,
                workspace_root,
                None,
                Some(package_root.to_string_lossy().to_string()),
                Some(error),
            );
            set_runtime_status(state, status.clone(), None);
            return status;
        }
    };

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
            let status = runtime_status(
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
            set_runtime_status(state, status.clone(), None);
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
    let status = runtime_status(
        "starting",
        Some(pid),
        workspace_root,
        Some(api_token.clone()),
        Some(package_root.to_string_lossy().to_string()),
        None,
    );
    set_runtime_status(state, status.clone(), Some(child.clone()));
    spawn_runtime_ready_watcher(
        app.clone(),
        child.clone(),
        workspace_root.to_path_buf(),
        package_root.clone(),
        Some(api_token.clone()),
    );
    spawn_runtime_waiter(
        app.clone(),
        child,
        workspace_root.to_path_buf(),
        package_root,
        Some(api_token),
    );
    status
}

fn stop_studio_runtime(state: &AppState) {
    let mut runtime = state.runtime.lock().expect("runtime state lock");
    stop_runtime_locked(&mut runtime);
}

fn stop_runtime_locked(runtime: &mut RuntimeProcessState) {
    if let Some(child) = runtime.child.take() {
        if let Ok(mut child) = child.lock() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

fn set_runtime_status(
    state: &AppState,
    status: studio::StudioRuntimeStatus,
    child: Option<Arc<Mutex<std::process::Child>>>,
) {
    let mut runtime = state.runtime.lock().expect("runtime state lock");
    runtime.status = Some(status);
    runtime.child = child;
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
        error,
    }
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
            format!(
                "Bundled Studio runtime is missing. Run `node scripts/build-studio-runtime.mjs --target=darwin-arm64` before building the app."
            )
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
                    let status = restart_studio_runtime_process(
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
                    stop_studio_runtime(&state);
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
                    stop_studio_runtime(&state);
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
    package_root: PathBuf,
    api_token: Option<String>,
) {
    let pid = child.lock().map(|child| child.id()).unwrap_or_default();
    thread::spawn(move || {
        for _ in 0..RUNTIME_STARTUP_POLL_ATTEMPTS {
            if runtime_answers_status(STUDIO_RUNTIME_PORT) {
                if let Some(state) = app.try_state::<AppState>() {
                    let mut runtime = state.runtime.lock().expect("runtime state lock");
                    let current_pid = runtime
                        .child
                        .as_ref()
                        .and_then(|current| current.lock().ok().map(|child| child.id()));
                    if current_pid == Some(pid) {
                        runtime.status = Some(runtime_status(
                            "running",
                            Some(pid),
                            &workspace_root,
                            api_token.clone(),
                            Some(package_root.to_string_lossy().to_string()),
                            None,
                        ));
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
                Some(package_root.to_string_lossy().to_string()),
                Some("Studio runtime started but did not answer /api/status.".to_string()),
            );
            let mut runtime = state.runtime.lock().expect("runtime state lock");
            let current_pid = runtime
                .child
                .as_ref()
                .and_then(|current| current.lock().ok().map(|child| child.id()));
            if current_pid == Some(pid) {
                runtime.status = Some(status.clone());
            }
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
    package_root: PathBuf,
    api_token: Option<String>,
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
                    let runtime_status = runtime_status(
                        if status.success() { "stopped" } else { "error" },
                        None,
                        &workspace_root,
                        api_token.clone(),
                        Some(package_root.to_string_lossy().to_string()),
                        if status.success() {
                            None
                        } else {
                            Some(format!(
                                "Studio runtime exited with code {:?}",
                                status.code()
                            ))
                        },
                    );
                    let mut runtime = state.runtime.lock().expect("runtime state lock");
                    let current_pid = runtime
                        .child
                        .as_ref()
                        .and_then(|current| current.lock().ok().map(|child| child.id()));
                    if current_pid == Some(pid) {
                        runtime.child = None;
                        runtime.status = Some(runtime_status.clone());
                        should_restart = !status.success() && should_restart_managed_runtime(&state);
                    }
                    drop(runtime);
                    let _ = app.emit(
                        "studio-runtime-log",
                        json!({ "stream": "system", "message": runtime_status.error }),
                    );
                    if should_restart {
                        let _ = app.emit(
                            "studio-runtime-log",
                            json!({ "stream": "system", "message": "Restarting Studio runtime after unexpected exit." }),
                        );
                        restart_studio_runtime_process(&app, &state, &workspace_root);
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
                        Some(package_root.to_string_lossy().to_string()),
                        Some(format!("Studio runtime status check failed: {error}")),
                    );
                    set_runtime_status(&state, status, None);
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

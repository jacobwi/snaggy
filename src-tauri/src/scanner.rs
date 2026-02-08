// Thin Tauri command wrappers around snaggy-core.
use snaggy_core::scanner;

use scanner::ScanResult;

#[tauri::command]
pub async fn scan_website(url: String) -> Result<ScanResult, String> {
    scanner::scan_website(&url).await
}

#[tauri::command]
pub async fn download_asset(url: String, save_path: String) -> Result<(), String> {
    scanner::download_asset(&url, &save_path).await
}

#[tauri::command]
pub async fn proxy_image(url: String) -> Result<String, String> {
    scanner::proxy_image(&url).await
}

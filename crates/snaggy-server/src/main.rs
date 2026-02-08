use axum::{
    extract::Query,
    http::{header, StatusCode},
    response::{IntoResponse, Json},
    routing::get,
    Router,
};
use serde::Deserialize;
use tower_http::cors::CorsLayer;

#[derive(Deserialize)]
struct UrlParam {
    url: String,
}

async fn api_scan(Query(params): Query<UrlParam>) -> impl IntoResponse {
    eprintln!("[scan] url={}", params.url);
    match snaggy_core::scanner::scan_website(&params.url).await {
        Ok(result) => {
            eprintln!(
                "[scan] OK: {} favicons, {} fonts",
                result.favicons.len(),
                result.fonts.len()
            );
            (StatusCode::OK, Json(serde_json::json!(result))).into_response()
        }
        Err(e) => {
            eprintln!("[scan] ERROR: {}", e);
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "error": e })),
            )
                .into_response()
        }
    }
}

async fn api_proxy_image(Query(params): Query<UrlParam>) -> impl IntoResponse {
    match snaggy_core::scanner::proxy_image(&params.url).await {
        Ok(data_url) => {
            (StatusCode::OK, Json(serde_json::json!({ "data": data_url }))).into_response()
        }
        Err(e) => {
            eprintln!("[proxy-image] ERROR: {}", e);
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "error": e })),
            )
                .into_response()
        }
    }
}

async fn api_download(Query(params): Query<UrlParam>) -> impl IntoResponse {
    match snaggy_core::scanner::download_asset_bytes(&params.url).await {
        Ok((bytes, content_type)) => {
            let filename = params
                .url
                .split('/')
                .last()
                .and_then(|s| s.split('?').next())
                .unwrap_or("download");

            (
                StatusCode::OK,
                [
                    (header::CONTENT_TYPE, content_type),
                    (
                        header::CONTENT_DISPOSITION,
                        format!("attachment; filename=\"{}\"", filename),
                    ),
                ],
                bytes,
            )
                .into_response()
        }
        Err(e) => {
            eprintln!("[download] ERROR: {}", e);
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "error": e })),
            )
                .into_response()
        }
    }
}

#[tokio::main]
async fn main() {
    let port: u16 = std::env::var("SNAGGY_PORT")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(3001);

    let api = Router::new()
        .route("/api/scan", get(api_scan))
        .route("/api/proxy-image", get(api_proxy_image))
        .route("/api/download", get(api_download));

    // In production, serve the built frontend from ./dist
    let app = if std::path::Path::new("./dist").exists() {
        api.fallback_service(
            tower_http::services::ServeDir::new("./dist")
                .append_index_html_on_directories(true),
        )
    } else {
        api
    };

    let app = app.layer(CorsLayer::permissive());

    let addr = format!("0.0.0.0:{}", port);
    println!("Snaggy server listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

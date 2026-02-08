use base64::Engine;
use regex::Regex;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use url::Url;

use crate::config::config;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub url: String,
    pub favicons: Vec<FaviconInfo>,
    pub fonts: Vec<FontInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FaviconInfo {
    pub url: String,
    pub rel: String,
    pub sizes: Option<String>,
    pub mime_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FontInfo {
    pub family: String,
    pub variants: Vec<FontVariant>,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FontVariant {
    pub style: String,
    pub weight: String,
    pub url: String,
    pub format: String,
}

pub fn build_client() -> Result<reqwest::Client, String> {
    let cfg = config();
    reqwest::Client::builder()
        .user_agent(&cfg.user_agent)
        .redirect(reqwest::redirect::Policy::limited(cfg.max_redirects))
        .timeout(cfg.timeout_global)
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))
}

pub fn normalize_url(input: &str) -> Result<Url, String> {
    let trimmed = input.trim();
    let with_scheme = if !trimmed.contains("://") {
        format!("https://{}", trimmed)
    } else {
        trimmed.to_string()
    };
    Url::parse(&with_scheme).map_err(|e| format!("Invalid URL: {}", e))
}

fn resolve_url(base: &Url, href: &str) -> Option<String> {
    base.join(href).ok().map(|u| u.to_string())
}

fn detect_font_source(url: &str) -> String {
    if url.contains("fonts.gstatic.com") || url.contains("fonts.googleapis.com") {
        "google-fonts".to_string()
    } else if url.contains("use.typekit.net") || url.contains("p.typekit.net") {
        "adobe-fonts".to_string()
    } else {
        "custom".to_string()
    }
}

fn infer_format_from_url(url: &str) -> String {
    let lower = url.to_lowercase();
    if lower.contains(".woff2") {
        "woff2".to_string()
    } else if lower.contains(".woff") {
        "woff".to_string()
    } else if lower.contains(".ttf") {
        "truetype".to_string()
    } else if lower.contains(".otf") {
        "opentype".to_string()
    } else if lower.contains(".eot") {
        "embedded-opentype".to_string()
    } else if lower.contains(".svg") {
        "svg".to_string()
    } else {
        "unknown".to_string()
    }
}

struct RawFontFace {
    family: String,
    weight: String,
    style: String,
    url: String,
    format: String,
}

fn parse_font_faces(css: &str, stylesheet_url: &Url) -> Vec<RawFontFace> {
    let mut results = Vec::new();

    let block_re = Regex::new(r"(?si)@font-face\s*\{([^}]+)\}").unwrap();
    let family_re = Regex::new(r#"(?i)font-family:\s*['"]?([^'";,}]+?)['"]?\s*[;,}]"#).unwrap();
    let weight_re = Regex::new(r"(?i)font-weight:\s*(\d+|normal|bold|lighter|bolder)").unwrap();
    let style_re = Regex::new(r"(?i)font-style:\s*(normal|italic|oblique)").unwrap();
    let src_re = Regex::new(
        r#"(?i)url\(\s*['"]?([^'")]+?)['"]?\s*\)(?:\s*format\(\s*['"]?([^'")]+?)['"]?\s*\))?"#,
    )
    .unwrap();

    for block_match in block_re.captures_iter(css) {
        let block = &block_match[1];

        let family = match family_re.captures(block) {
            Some(cap) => cap[1].trim().to_string(),
            None => continue,
        };

        let weight = weight_re
            .captures(block)
            .map(|c| c[1].to_string())
            .unwrap_or_else(|| "400".to_string());

        let style = style_re
            .captures(block)
            .map(|c| c[1].to_string())
            .unwrap_or_else(|| "normal".to_string());

        let mut best_url: Option<(String, String)> = None;
        let priority = |fmt: &str| -> i32 {
            match fmt.to_lowercase().as_str() {
                "woff2" => 4,
                "woff" => 3,
                "truetype" | "ttf" => 2,
                "opentype" | "otf" => 1,
                _ => 0,
            }
        };

        for src_cap in src_re.captures_iter(block) {
            let raw_url = src_cap[1].trim();
            if raw_url.starts_with("data:") {
                continue;
            }

            let resolved = match resolve_url(stylesheet_url, raw_url) {
                Some(u) => u,
                None => continue,
            };

            let format = src_cap
                .get(2)
                .map(|m| m.as_str().to_string())
                .unwrap_or_else(|| infer_format_from_url(&resolved));

            let p = priority(&format);
            let current_p = best_url.as_ref().map(|(_, f)| priority(f)).unwrap_or(-1);

            if p > current_p {
                best_url = Some((resolved, format));
            }
        }

        if let Some((url, format)) = best_url {
            results.push(RawFontFace {
                family,
                weight,
                style,
                url,
                format,
            });
        }
    }

    results
}

fn group_fonts(raw_faces: Vec<RawFontFace>) -> Vec<FontInfo> {
    let mut map: HashMap<String, Vec<FontVariant>> = HashMap::new();
    let mut sources: HashMap<String, String> = HashMap::new();

    for face in raw_faces {
        let source = detect_font_source(&face.url);
        sources.entry(face.family.clone()).or_insert(source);

        map.entry(face.family.clone())
            .or_default()
            .push(FontVariant {
                style: face.style,
                weight: face.weight,
                url: face.url,
                format: face.format,
            });
    }

    let mut fonts: Vec<FontInfo> = map
        .into_iter()
        .map(|(family, mut variants)| {
            variants.sort_by(|a, b| a.url.cmp(&b.url));
            variants.dedup_by(|a, b| a.url == b.url);
            variants.sort_by(|a, b| {
                a.weight
                    .parse::<i32>()
                    .unwrap_or(400)
                    .cmp(&b.weight.parse::<i32>().unwrap_or(400))
                    .then(a.style.cmp(&b.style))
            });

            let source = sources
                .remove(&family)
                .unwrap_or_else(|| "custom".to_string());
            FontInfo {
                family,
                variants,
                source,
            }
        })
        .collect();

    fonts.sort_by(|a, b| a.family.cmp(&b.family));
    fonts
}

struct ParsedPage {
    favicons: Vec<FaviconInfo>,
    favicon_ico_url: Option<String>,
    inline_faces: Vec<RawFontFace>,
    css_urls: Vec<String>,
}

fn parse_html_sync(html_text: &str, base_url: &Url) -> ParsedPage {
    let document = Html::parse_document(html_text);

    let mut favicons = Vec::new();
    let mut seen_urls = std::collections::HashSet::new();

    let link_selector = Selector::parse("link[rel]").unwrap();
    for element in document.select(&link_selector) {
        let rel = element
            .value()
            .attr("rel")
            .unwrap_or_default()
            .to_lowercase();
        if !rel.contains("icon") {
            continue;
        }
        let href = match element.value().attr("href") {
            Some(h) => h,
            None => continue,
        };
        let abs_url = match resolve_url(base_url, href) {
            Some(u) => u,
            None => continue,
        };
        if seen_urls.contains(&abs_url) {
            continue;
        }
        seen_urls.insert(abs_url.clone());

        favicons.push(FaviconInfo {
            url: abs_url,
            rel,
            sizes: element.value().attr("sizes").map(|s| s.to_string()),
            mime_type: element.value().attr("type").map(|t| t.to_string()),
        });
    }

    let favicon_ico = format!(
        "{}://{}/favicon.ico",
        base_url.scheme(),
        base_url.host_str().unwrap_or_default()
    );
    let favicon_ico_url = if seen_urls.contains(&favicon_ico) {
        None
    } else {
        Some(favicon_ico)
    };

    let mut inline_faces = Vec::new();

    let style_selector = Selector::parse("style").unwrap();
    for element in document.select(&style_selector) {
        let css_text = element.text().collect::<String>();
        inline_faces.extend(parse_font_faces(&css_text, base_url));
    }

    let stylesheet_selector =
        Selector::parse("link[rel='stylesheet'], link[rel='preload'][as='style']").unwrap();
    let mut css_urls = Vec::new();
    for element in document.select(&stylesheet_selector) {
        if let Some(href) = element.value().attr("href") {
            if let Some(abs_url) = resolve_url(base_url, href) {
                css_urls.push(abs_url);
            }
        }
    }
    css_urls.truncate(config().max_stylesheets);

    ParsedPage {
        favicons,
        favicon_ico_url,
        inline_faces,
        css_urls,
    }
}

async fn fetch_and_parse_stylesheets(
    css_urls: &[String],
    client: &reqwest::Client,
) -> Vec<RawFontFace> {
    let cfg = config();
    let mut all_faces = Vec::new();

    for css_url in css_urls {
        let parsed_url = match Url::parse(css_url) {
            Ok(u) => u,
            Err(_) => continue,
        };

        let resp = match client
            .get(css_url)
            .timeout(cfg.timeout_request)
            .send()
            .await
        {
            Ok(r) => r,
            Err(_) => continue,
        };

        if !resp.status().is_success() {
            continue;
        }

        let css_text = match resp.text().await {
            Ok(t) => t,
            Err(_) => continue,
        };

        let faces = parse_font_faces(&css_text, &parsed_url);
        all_faces.extend(faces);

        let import_re =
            Regex::new(r#"(?i)@import\s+(?:url\(\s*['"]?([^'")]+?)['"]?\s*\)|['"]([^'"]+?)['"])"#)
                .unwrap();
        let mut import_urls = Vec::new();
        for cap in import_re.captures_iter(&css_text) {
            let import_href = cap.get(1).or(cap.get(2)).map(|m| m.as_str());
            if let Some(href) = import_href {
                if let Some(abs) = resolve_url(&parsed_url, href) {
                    import_urls.push(abs);
                }
            }
        }

        import_urls.truncate(cfg.max_imports);
        for import_url in &import_urls {
            let import_parsed = match Url::parse(import_url) {
                Ok(u) => u,
                Err(_) => continue,
            };

            let resp = match client
                .get(import_url)
                .timeout(cfg.timeout_request)
                .send()
                .await
            {
                Ok(r) => r,
                Err(_) => continue,
            };

            if resp.status().is_success() {
                if let Ok(text) = resp.text().await {
                    let faces = parse_font_faces(&text, &import_parsed);
                    all_faces.extend(faces);
                }
            }
        }
    }

    all_faces
}

async fn check_favicon_ico(favicon_ico_url: &str, client: &reqwest::Client) -> Option<FaviconInfo> {
    let resp = client
        .head(favicon_ico_url)
        .timeout(config().timeout_probe)
        .send()
        .await
        .ok()?;

    if !resp.status().is_success() {
        return None;
    }

    let ct = resp
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default()
        .to_string();

    if ct.contains("image") || ct.contains("icon") || ct.is_empty() {
        Some(FaviconInfo {
            url: favicon_ico_url.to_string(),
            rel: "icon".to_string(),
            sizes: None,
            mime_type: if ct.is_empty() {
                Some("image/x-icon".to_string())
            } else {
                Some(ct)
            },
        })
    } else {
        None
    }
}

/// Scan a website and return all discovered favicons and fonts.
pub async fn scan_website(url: &str) -> Result<ScanResult, String> {
    let base_url = normalize_url(url)?;
    let client = build_client()?;

    let response = client
        .get(base_url.as_str())
        .send()
        .await
        .map_err(|e| format!("Failed to fetch website: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Website returned status {}",
            response.status().as_u16()
        ));
    }

    let html_text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    let base_url_clone = base_url.clone();
    let parsed = tokio::task::spawn_blocking(move || parse_html_sync(&html_text, &base_url_clone))
        .await
        .map_err(|e| format!("Parse task failed: {}", e))?;

    let mut favicons = parsed.favicons;

    if let Some(ico_url) = &parsed.favicon_ico_url {
        if let Some(ico) = check_favicon_ico(ico_url, &client).await {
            favicons.push(ico);
        }
    }

    let mut all_faces = parsed.inline_faces;
    let stylesheet_faces = fetch_and_parse_stylesheets(&parsed.css_urls, &client).await;
    all_faces.extend(stylesheet_faces);

    let fonts = group_fonts(all_faces);

    Ok(ScanResult {
        url: base_url.to_string(),
        favicons,
        fonts,
    })
}

/// Proxy an image URL and return its data as a base64 data URI.
pub async fn proxy_image(url: &str) -> Result<String, String> {
    let client = build_client()?;

    let response = client
        .get(url)
        .timeout(config().timeout_image)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch image: {}", e))?;

    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/png")
        .to_string();

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read image: {}", e))?;

    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{};base64,{}", content_type, b64))
}

/// Download an asset and return its bytes.
pub async fn download_asset_bytes(url: &str) -> Result<(Vec<u8>, String), String> {
    let client = build_client()?;

    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Download failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Download returned status {}",
            response.status().as_u16()
        ));
    }

    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("application/octet-stream")
        .to_string();

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read download: {}", e))?;

    Ok((bytes.to_vec(), content_type))
}

/// Download an asset and save to a file path.
pub async fn download_asset(url: &str, save_path: &str) -> Result<(), String> {
    let (bytes, _) = download_asset_bytes(url).await?;

    tokio::fs::write(save_path, &bytes)
        .await
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}

use std::sync::OnceLock;
use std::time::Duration;

/// Central configuration for Snaggy scanner.
/// All timeouts are configurable via environment variables, with sensible defaults.
#[derive(Debug, Clone)]
pub struct Config {
    /// Global HTTP client timeout (default: 30s)
    /// Env: SNAGGY_TIMEOUT_GLOBAL
    pub timeout_global: Duration,

    /// Timeout for individual requests like fetching the page, stylesheets, downloads (default: 10s)
    /// Env: SNAGGY_TIMEOUT_REQUEST
    pub timeout_request: Duration,

    /// Timeout for quick checks like HEAD /favicon.ico (default: 10s)
    /// Env: SNAGGY_TIMEOUT_PROBE
    pub timeout_probe: Duration,

    /// Timeout for image proxy requests (default: 10s)
    /// Env: SNAGGY_TIMEOUT_IMAGE
    pub timeout_image: Duration,

    /// Maximum number of stylesheets to fetch per scan (default: 20)
    /// Env: SNAGGY_MAX_STYLESHEETS
    pub max_stylesheets: usize,

    /// Maximum number of @import rules to follow per stylesheet (default: 5)
    /// Env: SNAGGY_MAX_IMPORTS
    pub max_imports: usize,

    /// User-Agent string
    pub user_agent: String,

    /// Maximum redirect hops (default: 10)
    pub max_redirects: usize,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            timeout_global: Duration::from_secs(30),
            timeout_request: Duration::from_secs(10),
            timeout_probe: Duration::from_secs(10),
            timeout_image: Duration::from_secs(10),
            max_stylesheets: 20,
            max_imports: 5,
            user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36".to_string(),
            max_redirects: 10,
        }
    }
}

impl Config {
    /// Load configuration from environment variables, falling back to defaults.
    pub fn from_env() -> Self {
        let defaults = Self::default();

        Self {
            timeout_global: read_duration_env("SNAGGY_TIMEOUT_GLOBAL", defaults.timeout_global),
            timeout_request: read_duration_env("SNAGGY_TIMEOUT_REQUEST", defaults.timeout_request),
            timeout_probe: read_duration_env("SNAGGY_TIMEOUT_PROBE", defaults.timeout_probe),
            timeout_image: read_duration_env("SNAGGY_TIMEOUT_IMAGE", defaults.timeout_image),
            max_stylesheets: read_usize_env("SNAGGY_MAX_STYLESHEETS", defaults.max_stylesheets),
            max_imports: read_usize_env("SNAGGY_MAX_IMPORTS", defaults.max_imports),
            user_agent: std::env::var("SNAGGY_USER_AGENT").unwrap_or(defaults.user_agent),
            max_redirects: read_usize_env("SNAGGY_MAX_REDIRECTS", defaults.max_redirects),
        }
    }
}

/// Read a duration (in seconds) from an environment variable.
fn read_duration_env(key: &str, default: Duration) -> Duration {
    std::env::var(key)
        .ok()
        .and_then(|v| v.parse::<u64>().ok())
        .map(Duration::from_secs)
        .unwrap_or(default)
}

/// Read a usize from an environment variable.
fn read_usize_env(key: &str, default: usize) -> usize {
    std::env::var(key)
        .ok()
        .and_then(|v| v.parse::<usize>().ok())
        .unwrap_or(default)
}

/// Global singleton config, initialized once on first access.
static CONFIG: OnceLock<Config> = OnceLock::new();

/// Get the global configuration (initializes from env on first call).
pub fn config() -> &'static Config {
    CONFIG.get_or_init(Config::from_env)
}

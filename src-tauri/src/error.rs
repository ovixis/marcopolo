use serde::ser::SerializeStruct;

/// Errors surfaced to the frontend as `{ code, message }` payloads.
#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("network error: {0}")]
    Network(#[from] reqwest::Error),

    #[error("{provider} rejected the request (HTTP {status}): {message}")]
    Provider {
        provider: &'static str,
        status: u16,
        message: String,
    },

    #[error("could not parse {provider} response: {message}")]
    Decode {
        provider: &'static str,
        message: String,
    },

    #[error("{0}")]
    InvalidInput(String),
}

impl ApiError {
    pub fn code(&self) -> &'static str {
        match self {
            ApiError::Network(_) => "network",
            ApiError::Provider { .. } => "provider",
            ApiError::Decode { .. } => "decode",
            ApiError::InvalidInput(_) => "invalid_input",
        }
    }
}

impl serde::Serialize for ApiError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut state = serializer.serialize_struct("ApiError", 2)?;
        state.serialize_field("code", self.code())?;
        state.serialize_field("message", &self.to_string())?;
        state.end()
    }
}

/// Build a Provider error from a non-success HTTP response, extracting the
/// human-readable detail from `errors[0]`-style bodies (Duffel uses
/// `errors[0].message`, other providers use `detail`/`title`).
pub async fn provider_error(provider: &'static str, response: reqwest::Response) -> ApiError {
    let status = response.status().as_u16();
    let message = match response.json::<serde_json::Value>().await {
        Ok(body) => body
            .pointer("/errors/0/message")
            .or_else(|| body.pointer("/errors/0/detail"))
            .or_else(|| body.pointer("/errors/0/title"))
            .or_else(|| body.pointer("/error_description"))
            .and_then(|v| v.as_str())
            .map(str::to_owned)
            .unwrap_or_else(|| "no error detail provided".to_owned()),
        Err(_) => "no error detail provided".to_owned(),
    };
    ApiError::Provider {
        provider,
        status,
        message,
    }
}

use thiserror::Error;
use worker::{Response, Result};

#[derive(Debug, Error)]
pub enum Error {
    #[error("bad request: {0}")]
    BadRequest(String),

    #[error("upstream error: {0}")]
    Upstream(String),

    #[error("rate limited; retry after {retry_after}s")]
    RateLimited { retry_after: u32 },

    #[error("not implemented")]
    NotImplemented,

    #[error("internal: {0}")]
    Internal(String),
}

impl Error {
    pub fn into_response(self) -> Result<Response> {
        match &self {
            Error::BadRequest(_) => Response::error(self.to_string(), 400),
            Error::Upstream(_) => Response::error(self.to_string(), 502),
            Error::RateLimited { retry_after } => {
                let mut res = Response::error(self.to_string(), 429)?;
                res.headers_mut()
                    .set("retry-after", &retry_after.to_string())?;
                Ok(res)
            }
            Error::NotImplemented => Response::error(self.to_string(), 501),
            Error::Internal(_) => Response::error(self.to_string(), 500),
        }
    }
}

impl From<worker::Error> for Error {
    fn from(e: worker::Error) -> Self {
        Error::Internal(e.to_string())
    }
}

impl From<serde_json::Error> for Error {
    fn from(e: serde_json::Error) -> Self {
        Error::BadRequest(format!("json: {e}"))
    }
}

use worker::{Request, Response, Result, RouteContext};

use crate::error::Error;

pub async fn negotiate(_req: Request, _ctx: RouteContext<()>) -> Result<Response> {
    // R2 will port lib/llm.ts here: parse NegotiateRequest, call the
    // OpenAI-compatible LLM (Cerebras default) with forced tool_choice("respond"),
    // validate end-gate, return NegotiateReply.
    Error::NotImplemented.into_response()
}

pub async fn voice(_req: Request, _ctx: RouteContext<()>) -> Result<Response> {
    // R3 will port lib/elevenlabs.ts here: parse VoiceRequest, call ElevenLabs
    // textToSpeech.stream with mood-tuned voice settings, forward MP3 bytes.
    Error::NotImplemented.into_response()
}

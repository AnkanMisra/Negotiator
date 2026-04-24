use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Mood {
    Calm,
    Suspicious,
    Angry,
    Amused,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Secret {
    Contraband,
    FakePassport,
    Fugitive,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    Guard,
    Player,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum EndKind {
    Pass,
    Arrest,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Turn {
    pub role: Role,
    pub text: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mood: Option<Mood>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NegotiateRequest {
    pub secret: Secret,
    pub trust: i32,
    pub suspicion: i32,
    #[serde(default)]
    pub history: Vec<Turn>,
    #[serde(rename = "playerInput")]
    pub player_input: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NegotiateReply {
    pub reply: String,
    pub mood: Mood,
    pub trust_delta: i32,
    pub suspicion_delta: i32,
    pub voice_style: Mood,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub end: Option<EndKind>,
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub fallback: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct VoiceRequest {
    pub text: String,
    pub mood: Mood,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    // Mood — TS side sends lowercase string literals ("calm" | "suspicious" | ...)

    #[test]
    fn mood_serializes_lowercase() {
        assert_eq!(serde_json::to_string(&Mood::Calm).unwrap(), "\"calm\"");
        assert_eq!(serde_json::to_string(&Mood::Suspicious).unwrap(), "\"suspicious\"");
        assert_eq!(serde_json::to_string(&Mood::Angry).unwrap(), "\"angry\"");
        assert_eq!(serde_json::to_string(&Mood::Amused).unwrap(), "\"amused\"");
    }

    #[test]
    fn mood_deserializes_lowercase() {
        let m: Mood = serde_json::from_str("\"calm\"").unwrap();
        assert_eq!(m, Mood::Calm);
        let m: Mood = serde_json::from_str("\"angry\"").unwrap();
        assert_eq!(m, Mood::Angry);
    }

    // Secret — TS side uses snake_case ("contraband" | "fake_passport" | "fugitive")

    #[test]
    fn secret_uses_snake_case_matching_ts() {
        assert_eq!(serde_json::to_string(&Secret::Contraband).unwrap(), "\"contraband\"");
        assert_eq!(serde_json::to_string(&Secret::FakePassport).unwrap(), "\"fake_passport\"");
        assert_eq!(serde_json::to_string(&Secret::Fugitive).unwrap(), "\"fugitive\"");
    }

    #[test]
    fn secret_round_trip() {
        for s in [Secret::Contraband, Secret::FakePassport, Secret::Fugitive] {
            let json = serde_json::to_string(&s).unwrap();
            let back: Secret = serde_json::from_str(&json).unwrap();
            assert_eq!(s, back);
        }
    }

    // Role — matches TS "guard" | "player"

    #[test]
    fn role_lowercase() {
        assert_eq!(serde_json::to_string(&Role::Guard).unwrap(), "\"guard\"");
        assert_eq!(serde_json::to_string(&Role::Player).unwrap(), "\"player\"");
    }

    // EndKind — matches TS "pass" | "arrest"

    #[test]
    fn end_kind_lowercase() {
        assert_eq!(serde_json::to_string(&EndKind::Pass).unwrap(), "\"pass\"");
        assert_eq!(serde_json::to_string(&EndKind::Arrest).unwrap(), "\"arrest\"");
    }

    // NegotiateReply — TS uses camelCase: trustDelta, suspicionDelta, voiceStyle.

    #[test]
    fn negotiate_reply_emits_camelcase() {
        let r = NegotiateReply {
            reply: "Papers.".into(),
            mood: Mood::Suspicious,
            trust_delta: 5,
            suspicion_delta: -3,
            voice_style: Mood::Suspicious,
            end: None,
            fallback: false,
        };
        let v = serde_json::to_value(&r).unwrap();
        assert!(v.get("trustDelta").is_some(), "expected camelCase trustDelta");
        assert!(v.get("suspicionDelta").is_some(), "expected camelCase suspicionDelta");
        assert!(v.get("voiceStyle").is_some(), "expected camelCase voiceStyle");
        assert!(v.get("trust_delta").is_none(), "should not emit snake_case");
        assert_eq!(v["trustDelta"], 5);
        assert_eq!(v["suspicionDelta"], -3);
        assert_eq!(v["voiceStyle"], "suspicious");
    }

    #[test]
    fn negotiate_reply_omits_end_when_none() {
        let r = NegotiateReply {
            reply: "Hm.".into(),
            mood: Mood::Suspicious,
            trust_delta: 0,
            suspicion_delta: 5,
            voice_style: Mood::Suspicious,
            end: None,
            fallback: false,
        };
        let v = serde_json::to_value(&r).unwrap();
        assert!(v.get("end").is_none(), "end field must be omitted when None");
    }

    #[test]
    fn negotiate_reply_omits_fallback_when_false() {
        let r = NegotiateReply {
            reply: "Hm.".into(),
            mood: Mood::Suspicious,
            trust_delta: 0,
            suspicion_delta: 0,
            voice_style: Mood::Suspicious,
            end: None,
            fallback: false,
        };
        let v = serde_json::to_value(&r).unwrap();
        assert!(v.get("fallback").is_none(), "fallback=false must be omitted");
    }

    #[test]
    fn negotiate_reply_includes_fallback_when_true() {
        let r = NegotiateReply {
            reply: "...".into(),
            mood: Mood::Suspicious,
            trust_delta: 0,
            suspicion_delta: 5,
            voice_style: Mood::Suspicious,
            end: None,
            fallback: true,
        };
        let v = serde_json::to_value(&r).unwrap();
        assert_eq!(v["fallback"], true);
    }

    #[test]
    fn negotiate_reply_emits_end_when_set() {
        let r = NegotiateReply {
            reply: "Go.".into(),
            mood: Mood::Calm,
            trust_delta: 15,
            suspicion_delta: -5,
            voice_style: Mood::Calm,
            end: Some(EndKind::Pass),
            fallback: false,
        };
        let v = serde_json::to_value(&r).unwrap();
        assert_eq!(v["end"], "pass");
    }

    // NegotiateRequest — TS client sends playerInput in camelCase, everything else lowercase

    #[test]
    fn negotiate_request_parses_ts_shape() {
        let src = json!({
            "secret": "contraband",
            "trust": 35,
            "suspicion": 35,
            "history": [],
            "playerInput": "hello"
        });
        let req: NegotiateRequest = serde_json::from_value(src).unwrap();
        assert_eq!(req.secret, Secret::Contraband);
        assert_eq!(req.trust, 35);
        assert_eq!(req.suspicion, 35);
        assert!(req.history.is_empty());
        assert_eq!(req.player_input, "hello");
    }

    #[test]
    fn negotiate_request_rejects_snake_case_player_input() {
        // F1 dedup contract: the client sends "playerInput", not "player_input".
        // If we ever see snake_case, the rename_all config is wrong.
        let src = json!({
            "secret": "contraband",
            "trust": 35,
            "suspicion": 35,
            "history": [],
            "player_input": "hello"
        });
        let r: std::result::Result<NegotiateRequest, _> = serde_json::from_value(src);
        assert!(r.is_err(), "should only accept camelCase playerInput");
    }

    #[test]
    fn negotiate_request_parses_history_with_turns() {
        let src = json!({
            "secret": "fake_passport",
            "trust": 40,
            "suspicion": 20,
            "history": [
                { "role": "player", "text": "hello" },
                { "role": "guard", "text": "Papers.", "mood": "suspicious" }
            ],
            "playerInput": "second"
        });
        let req: NegotiateRequest = serde_json::from_value(src).unwrap();
        assert_eq!(req.history.len(), 2);
        assert_eq!(req.history[0].role, Role::Player);
        assert_eq!(req.history[0].mood, None);
        assert_eq!(req.history[1].role, Role::Guard);
        assert_eq!(req.history[1].mood, Some(Mood::Suspicious));
    }

    // Turn

    #[test]
    fn turn_omits_mood_when_none() {
        let t = Turn { role: Role::Player, text: "hi".into(), mood: None };
        let v = serde_json::to_value(&t).unwrap();
        assert!(v.get("mood").is_none());
        assert_eq!(v["role"], "player");
        assert_eq!(v["text"], "hi");
    }

    #[test]
    fn turn_includes_mood_when_set() {
        let t = Turn {
            role: Role::Guard,
            text: "Do not test me.".into(),
            mood: Some(Mood::Angry),
        };
        let v = serde_json::to_value(&t).unwrap();
        assert_eq!(v["mood"], "angry");
    }

    // VoiceRequest — TS client sends { text, mood }

    #[test]
    fn voice_request_parses_ts_shape() {
        let src = json!({ "text": "Papers.", "mood": "suspicious" });
        let v: VoiceRequest = serde_json::from_value(src).unwrap();
        assert_eq!(v.text, "Papers.");
        assert_eq!(v.mood, Mood::Suspicious);
    }
}

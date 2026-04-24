export type Mood = "calm" | "suspicious" | "angry" | "amused";

export type Secret = "contraband" | "fake_passport" | "fugitive";

export type Turn = {
  role: "guard" | "player";
  text: string;
  mood?: Mood;
};

export type PassportPurpose = "BUSINESS" | "FAMILY" | "TRANSIT";

export type Passport = {
  name: string;
  origin: string;
  purpose: PassportPurpose;
  photoSeed: number;
};

export type ClaimField = "name" | "purpose" | "origin" | "relation";

export type Claim = {
  field: ClaimField;
  value: string;
};

export type NegotiateReply = {
  reply: string;
  mood: Mood;
  trustDelta: number;
  suspicionDelta: number;
  voiceStyle: Mood;
  end?: "pass" | "arrest";
  updatedClaims?: Claim[];
};

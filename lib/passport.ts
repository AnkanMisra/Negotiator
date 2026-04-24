import type { Passport, PassportPurpose, Secret } from "./types";

// Slavic / Eastern European pool — flavor matches Viktor's world.
const FIRST_NAMES = [
  "Anna",
  "Dmitri",
  "Katarzyna",
  "Milos",
  "Ivana",
  "Tomasz",
  "Eva",
  "Lukas",
  "Magda",
  "Stefan",
];

const LAST_NAMES = [
  "Kowalczyk",
  "Volkov",
  "Novak",
  "Petrova",
  "Horvath",
  "Dvorak",
  "Kaminski",
  "Radic",
  "Stoyanov",
  "Lazar",
];

const ORIGINS = [
  "Warsaw",
  "Krakow",
  "Minsk",
  "Riga",
  "Vilnius",
  "Bucharest",
  "Sofia",
  "Prague",
  "Brno",
  "Ljubljana",
];

const PURPOSES: PassportPurpose[] = ["BUSINESS", "FAMILY", "TRANSIT"];

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/**
 * Generate a passport for the given secret. The secret subtly influences the
 * cover story — a "contraband" runner usually claims BUSINESS, a "fugitive"
 * usually claims TRANSIT — but Viktor doesn't know this. The values stay
 * consistent per game (stored on initial state).
 */
export function generatePassport(secret: Secret): Passport {
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const origin = pick(ORIGINS);

  // Bias the stamped purpose by the secret so the cover story feels intentional.
  let purpose: PassportPurpose;
  const r = Math.random();
  if (secret === "contraband") {
    purpose = r < 0.7 ? "BUSINESS" : r < 0.9 ? "TRANSIT" : "FAMILY";
  } else if (secret === "fugitive") {
    purpose = r < 0.6 ? "TRANSIT" : r < 0.85 ? "FAMILY" : "BUSINESS";
  } else {
    // fake_passport — anything, doesn't care
    purpose = pick(PURPOSES);
  }

  return {
    name: `${firstName} ${lastName}`,
    origin,
    purpose,
    photoSeed: Math.floor(Math.random() * 1000),
  };
}

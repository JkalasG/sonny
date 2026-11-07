// Explicaciones locales (sin IA): titular, razón y pasos por veredicto y por señal de las reglas.
// Límites (arquitectura 9.3): titular ≤ 8 palabras, razón ≤ 20, pasos ≤ 3.

import type { Formality, Lang } from "./settings";
import type { LinkSignal, RulesResult } from "./urlAnalyzer";

export type Verdict = "scam" | "suspicious" | "safe";

type V = { en: string; tu: string; usted?: string };
const pick = (v: V, lang: Lang, f: Formality) => (lang === "en" ? v.en : f === "usted" ? (v.usted ?? v.tu) : v.tu);

const HEADLINE: Record<Verdict, V> = {
  scam: { en: "Don't open it. It's a scam.", tu: "NO lo abras. Es una estafa.", usted: "NO lo abra. Es una estafa." },
  suspicious: { en: "Wait. This doesn't look right.", tu: "Espera. Esto no me convence.", usted: "Espere. Esto no me convence." },
  safe: { en: "This looks normal.", tu: "Esto parece normal." },
};

const REASON: Record<Verdict, V> = {
  scam: {
    en: "It has the typical signs of a scam to take your money or data.",
    tu: "Tiene las señales típicas de una estafa para quitarte dinero o datos.",
    usted: "Tiene las señales típicas de una estafa para quitarle dinero o datos.",
  },
  suspicious: {
    en: "Better not do anything yet. Let's check it first.",
    tu: "Mejor no hagas nada todavía. Primero lo comprobamos.",
    usted: "Mejor no haga nada todavía. Primero lo comprobamos.",
  },
  safe: {
    en: "But remember: never share your passwords or codes.",
    tu: "Pero ya sabes: tus claves y códigos, nunca a nadie.",
    usted: "Pero ya sabe: sus claves y códigos, nunca a nadie.",
  },
};

const STEPS: Record<Verdict, V[]> = {
  scam: [
    { en: "Don't tap the link.", tu: "No toques el enlace.", usted: "No toque el enlace." },
    { en: "Don't reply or give any details.", tu: "No respondas ni des datos.", usted: "No responda ni dé datos." },
    { en: "Delete the message.", tu: "Borra el mensaje.", usted: "Borre el mensaje." },
  ],
  suspicious: [
    { en: "Don't tap any link.", tu: "No toques ningún enlace.", usted: "No toque ningún enlace." },
    { en: "Don't give passwords or codes.", tu: "No des claves ni códigos.", usted: "No dé claves ni códigos." },
    { en: "Call the official number to check.", tu: "Llama al número oficial para comprobarlo.", usted: "Llame al número oficial para comprobarlo." },
  ],
  safe: [
    { en: "Still, never share passwords or codes.", tu: "Aun así, no des claves ni códigos.", usted: "Aun así, no dé claves ni códigos." },
    { en: "If in doubt, call the official number.", tu: "Si dudas, llama al número oficial.", usted: "Si duda, llame al número oficial." },
  ],
};

const EMERGENCY: V[] = [
  { en: "Call your bank using the number on your card.", tu: "Llama a tu banco al número de tu tarjeta.", usted: "Llame a su banco al número de su tarjeta." },
  { en: "Ask them to block your card.", tu: "Pide que bloqueen tu tarjeta.", usted: "Pida que bloqueen su tarjeta." },
  { en: "Tell someone you trust.", tu: "Cuéntaselo a alguien de confianza.", usted: "Cuénteselo a alguien de confianza." },
];

/** Explicación sencilla de cada señal de las reglas de enlaces. */
export function signalText(s: LinkSignal, lang: Lang, f: Formality): string {
  const brand = "brand" in s ? s.brand.toUpperCase() : "";
  const map: Record<LinkSignal["kind"], V> = {
    lookalike: {
      en: `This link looks like ${brand}, but it's fake.`,
      tu: `Este enlace parece de ${brand}, pero es falso.`,
    },
    brandInSubdomain: {
      en: `It says ${brand}, but the website really belongs to someone else.`,
      tu: `Dice ${brand}, pero la web es en realidad de otro.`,
    },
    ip: { en: "The link is just numbers, not a real website name.", tu: "El enlace son solo números, no el nombre de una web." },
    punycode: { en: "The link uses letters that only look normal.", tu: "El enlace usa letras que solo parecen normales." },
    shortener: { en: "The link is shortened: it hides where it goes.", tu: "El enlace está acortado: esconde a dónde lleva." },
    riskyTld: {
      en: `The website ends in “.${"tld" in s ? s.tld : ""}”, often used by scammers.`,
      tu: `La web termina en “.${"tld" in s ? s.tld : ""}”, muy usada en estafas.`,
    },
    noHttps: { en: "The link is not secure (no https).", tu: "El enlace no es seguro (sin https)." },
  };
  return pick(map[s.kind], lang, f);
}

export type LocalExplanation = { headline: string; reason: string; steps: string[]; emergencySteps: string[] };

export function localExplanation(verdict: Verdict, rules: RulesResult, lang: Lang, f: Formality): LocalExplanation {
  // Si las reglas vieron algo grave, esa es la mejor razón: es concreta.
  const severe = rules.links.flatMap((l) => l.signals).find((s) =>
    ["lookalike", "brandInSubdomain", "ip", "punycode"].includes(s.kind),
  );
  return {
    headline: pick(HEADLINE[verdict], lang, f),
    reason: severe && verdict !== "safe" ? signalText(severe, lang, f) : pick(REASON[verdict], lang, f),
    steps: STEPS[verdict].map((s) => pick(s, lang, f)),
    emergencySteps: EMERGENCY.map((s) => pick(s, lang, f)),
  };
}

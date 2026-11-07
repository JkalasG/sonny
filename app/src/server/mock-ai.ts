// SOLO SERVIDOR. Sustituye ÚNICAMENTE a Gemini (la segunda opinión) para probar sin clave (AI_PROVIDER=mock).
// El modelo propio (filtro 1, en el dispositivo) no se toca: sigue decidiendo primero, y si la estafa
// es clara (p >= T_SCAM) este simulador ni siquiera se llama. Decide con palabras clave para poder
// recorrer todos los caminos de la cascada; su veredicto pasa por la misma tabla de decisión que Gemini.
//
// AI_MOCK_SCENARIO:
//   auto        (por defecto) decide por palabras clave
//   scam | suspicious | safe   responde siempre ese veredicto
//   fail        la IA responde con error  -> la app usa solo el modelo propio
//   slow        tarda más que el límite   -> la app agota la espera y usa solo el modelo propio
//   unreadable  en fotos no "lee" texto   -> la app pide escribir el mensaje
// AI_MOCK_DELAY_MS: espera simulada (por defecto 600 ms).

import type { AIOpinion, AnalyzeRequest } from "../lib/ai/schema";
import { localExplanation, type Verdict } from "../lib/templates";
import { analyzeLinks } from "../lib/urlAnalyzer";
import type { AIProvider } from "./ai";

const SCAM_WORDS = [
  "premio", "ganad", "reclam", "bloquead", "suspendid", "verifique", "verifica tus", "urgente", "inmediat",
  "transfier", "deposit", "criptomoneda", "duplique", "garantizad", "número nuevo", "numero nuevo",
  "prize", "won", "winner", "claim", "locked", "suspended", "verify", "urgent", "crypto", "double your",
  "guaranteed", "new number", "gift card",
];
const SUSPICIOUS_WORDS = ["pague", "pago", "multa", "paquete", "retenid", "clave", "contraseña", "código", "pay", "fine", "package", "password", "toll"];

// Lo que "lee" el simulador en una foto (no mira la imagen).
const PHOTO_TEXT = {
  en: "Your package is on hold. Pay $1.99 to release it at: delivery-redeliver.info/pay",
  es: "Su paquete está retenido. Pague 1,99 para liberarlo en: entregas-envio.info/pago",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function classify(text: string): Verdict {
  const t = text.toLowerCase();
  const hits = (ws: string[]) => ws.filter((w) => t.includes(w)).length;
  if (hits(SCAM_WORDS) >= 1 || analyzeLinks(text).severe) return "scam";
  if (hits(SUSPICIOUS_WORDS) >= 1) return "suspicious";
  return "safe";
}

export class MockProvider implements AIProvider {
  async secondOpinion(input: AnalyzeRequest): Promise<AIOpinion> {
    const scenario = (process.env.AI_MOCK_SCENARIO ?? "auto").toLowerCase();
    const delay = Number(process.env.AI_MOCK_DELAY_MS ?? 600);
    const timeout = Number(process.env.AI_TIMEOUT_MS ?? 14000);

    if (scenario === "slow") await sleep(timeout + 2000);
    else await sleep(delay);
    if (scenario === "fail" || scenario === "slow") throw new Error(`IA simulada: escenario "${scenario}"`);

    const extractedText = input.imageBase64 ? (scenario === "unreadable" ? "" : PHOTO_TEXT[input.replyLanguage]) : "";
    const text = input.imageBase64 ? extractedText : (input.text ?? "");
    const verdict: Verdict = ["scam", "suspicious", "safe"].includes(scenario) ? (scenario as Verdict) : classify(text);

    const e = localExplanation(verdict, analyzeLinks(text), input.replyLanguage, input.formality);
    const tag = input.replyLanguage === "es" ? "IA simulada" : "Mock AI";
    return {
      verdict,
      extractedText,
      headline: e.headline,
      reason: e.reason,
      steps: e.steps,
      emergencySteps: e.emergencySteps,
      signals: [{ quote: "", explanation: `${tag}: ${input.replyLanguage === "es" ? "respuesta de prueba, no es un análisis real." : "test answer, not a real analysis."}` }],
    };
  }
}

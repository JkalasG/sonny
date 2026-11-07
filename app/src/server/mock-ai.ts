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
//   unreadable  igual que auto (el simulador nunca lee fotos; ver abajo)
//
// Fotos: el simulador NO mira la imagen y devuelve el texto vacío. La app entonces lee la foto en el propio
// equipo (OCR: tesseract.js en la web, ML Kit en la APK) y pide la segunda opinión sobre ese texto real.
// Antes "leía" siempre un mensaje fijo de paquete retenido, y la app mostraba un mensaje que no era el de la foto.
// AI_MOCK_DELAY_MS: espera simulada (por defecto 600 ms).

import type { AIOpinion, AnalyzeRequest } from "../lib/ai/schema";
import { localExplanation, type Verdict } from "../lib/templates";
import { analyzeLinks } from "../lib/urlAnalyzer";
import type { AIProvider } from "./ai";

// Sin tildes ni mayúsculas: el texto se normaliza igual antes de buscar (ver normalize()).
const SCAM_WORDS = [
  "premio", "ganad", "reclam", "bloquead", "suspendid", "verifique", "verifica tus", "urgente", "inmediat",
  "transfier", "deposit", "criptomoneda", "duplique", "garantizad", "numero nuevo",
  // "familiar en apuros": "Hola mamá, se me rompió el celular, este es mi número nuevo, escríbeme por WhatsApp"
  "se me ha roto", "se me rompio", "nuevo numero", "va a ser mi numero", "este es mi numero", "mi numero nuevo",
  "escribeme por whats", "enviame un mensaje por whats", "mensaje por whats", "por whats app",
  "prize", "won", "winner", "claim", "locked", "suspended", "verify", "urgent", "crypto", "double your",
  "guaranteed", "new number", "gift card", "my phone broke", "phone is broken", "text me on whatsapp", "message me on whatsapp",
];
const SUSPICIOUS_WORDS = ["pague", "pago", "multa", "paquete", "retenid", "clave", "contrasena", "codigo", "pay", "fine", "package", "password", "toll"];


const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const normalize = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");

function classify(text: string): Verdict {
  const t = normalize(text);
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

    const extractedText = ""; // no lee fotos: la app las lee en el equipo y vuelve a preguntar con el texto
    const text = input.text ?? "";
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

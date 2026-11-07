// La cascada de dos filtros (documento de arquitectura, sección 8).
//   Filtro 1 (siempre, en el dispositivo): detector de idioma -> Sonny-EN / Sonny-ES + reglas de enlaces.
//   Filtro 2 (solo con internet y si no es una estafa clara): segunda opinión de la IA.

import { Platform } from "react-native";

import type { AIOpinion, AnalyzeRequest, AnalyzeResponse } from "./ai/schema";
import { decide, needsAI } from "./decide";
import { ocrAvailable, readTextFromImage } from "./ocr";
import { enoughText } from "./ocr-shared";
import { explainWords, loadModel, type WordWeight } from "./model";
import type { Settings } from "./settings";
import { detectLang, scoreMessage } from "./sonny/scorer";
import { localExplanation, type Verdict } from "./templates";
import { analyzeLinks, type RulesResult } from "./urlAnalyzer";

export type AiStatus = "used" | "skipped_clear_scam" | "offline" | "failed" | "not_configured";

export type Analysis = {
  text: string;               // mensaje analizado (el escrito o el leído de la foto)
  fromPhoto: boolean;
  photoReader: "ai" | "device" | null; // quién leyó el texto de la foto
  messageLang: "en" | "es";   // idioma del modelo usado
  langDetected: boolean;      // false = el detector dudó y se usó el idioma del usuario
  p: number;                  // probabilidad de estafa del modelo propio
  thresholds: { scam: number; mid: number; safe: number };
  rules: RulesResult;
  verdict: Verdict;
  ai: AiStatus;
  aiProvider: string | null; // "gemini", "mock"… (null si no se usó la IA)
  aiSignals: AIOpinion["signals"];
  headline: string;
  reason: string;
  steps: string[];
  emergencySteps: string[];
  words: WordWeight[];
};

const AI_TIMEOUT_MS = 15000;

function apiBase(): string | null {
  if (Platform.OS === "web") return ""; // misma web: ruta relativa
  const url = process.env.EXPO_PUBLIC_API_URL;
  return url ? url.replace(/\/$/, "") : null; // APK sin URL configurada = sin IA
}

type AiResult = { opinion: AIOpinion; provider: string } | { status: Exclude<AiStatus, "used" | "skipped_clear_scam"> };

async function askAI(req: AnalyzeRequest): Promise<AiResult> {
  const base = apiBase();
  if (base === null) return { status: "offline" };
  if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.onLine === false) return { status: "offline" };
  try {
    const res = await fetch(`${base}/api/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });
    const data = (await res.json().catch(() => null)) as AnalyzeResponse | null;
    if (data?.ok) return { opinion: data.opinion, provider: data.provider };
    if (data && !data.ok && data.error === "not_configured") return { status: "not_configured" };
    return { status: "failed" };
  } catch (e) {
    // Error de red = sin conexión; tiempo agotado = la IA falló.
    return { status: e instanceof Error && e.name === "TimeoutError" ? "failed" : "offline" };
  }
}

export class PhotoError extends Error {
  constructor(public kind: "needs_internet" | "unreadable") {
    super(kind);
  }
}

export type Input =
  | { text: string }
  | { imageBase64: string; imageMimeType: "image/jpeg" | "image/png" | "image/webp"; uri?: string };

export async function analyze(input: Input, user: Settings): Promise<Analysis> {
  const base = { replyLanguage: user.language, formality: user.formality } as const;

  // Foto: primero la IA (lee mejor); si no está disponible, OCR en el propio dispositivo
  // (tesseract.js en la web, ML Kit en la APK). El texto leído sigue la cascada igual que uno escrito.
  let text: string;
  let photoOpinion: AIOpinion | null = null;
  let photoReader: Analysis["photoReader"] = null;
  let aiDown: AiStatus | null = null; // la IA ya falló con la foto: no volver a esperarla
  let provider: string | null = null;
  if ("imageBase64" in input) {
    const r = await askAI({ ...base, imageBase64: input.imageBase64, imageMimeType: input.imageMimeType });
    if ("opinion" in r && r.opinion.extractedText.trim()) {
      photoOpinion = r.opinion;
      provider = r.provider;
      text = r.opinion.extractedText;
      photoReader = "ai";
    } else {
      if (!("opinion" in r) && r.status !== "failed") aiDown = r.status;
      const local = await readTextFromImage(input).catch((e) => {
        console.warn("[sonny] OCR local falló", e);
        return "";
      });
      if (!enoughText(local)) {
        throw new PhotoError(!ocrAvailable && aiDown === "offline" ? "needs_internet" : "unreadable");
      }
      text = local;
      photoReader = "device";
    }
  } else {
    text = input.text.trim();
  }

  // Filtro 1: idioma + modelo propio + reglas.
  const langModel = await loadModel("lang");
  const detected = detectLang(langModel, text);
  const messageLang = detected ?? user.language;
  const model = await loadModel(messageLang);
  const p = scoreMessage(model, text);
  const rules = analyzeLinks(text);
  const th = model.thresholds as Analysis["thresholds"];

  let opinion: AIOpinion | null = photoOpinion;
  let ai: AiStatus;

  if (!needsAI(p, th)) {
    ai = photoOpinion ? "used" : "skipped_clear_scam"; // estafa clara: el mensaje no sale del dispositivo
  } else {
    const r: AiResult = photoOpinion
      ? { opinion: photoOpinion, provider: provider ?? "" }
      : aiDown
        ? { status: aiDown as Exclude<AiStatus, "used" | "skipped_clear_scam"> }
        : await askAI({ ...base, text });
    if ("opinion" in r) {
      ai = "used";
      opinion = r.opinion;
      provider = r.provider;
    } else {
      ai = r.status;
    }
  }
  const verdict: Verdict = decide(p, th, ai === "used" && opinion ? opinion.verdict : null, rules.severe);

  // Textos: los de la IA si su veredicto coincide con el final; si no, las plantillas locales.
  const local = localExplanation(verdict, rules, user.language, user.formality);
  const useAiText = opinion && opinion.verdict === verdict;
  return {
    text,
    fromPhoto: photoReader !== null,
    photoReader,
    messageLang,
    langDetected: detected !== null,
    p,
    thresholds: th,
    rules,
    verdict,
    ai,
    aiProvider: ai === "used" ? provider : null,
    aiSignals: opinion?.signals ?? [],
    headline: useAiText ? opinion!.headline : local.headline,
    reason: useAiText ? opinion!.reason : local.reason,
    steps: useAiText && opinion!.steps.length ? opinion!.steps : local.steps,
    emergencySteps: useAiText && opinion!.emergencySteps.length ? opinion!.emergencySteps : local.emergencySteps,
    words: explainWords(model, text),
  };
}

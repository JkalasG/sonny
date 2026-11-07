// Contrato de la segunda opinión (arquitectura 9.3). Compartido por la app y el servidor.

import { z } from "zod";

export const VERDICTS = ["scam", "suspicious", "safe"] as const;

export const AIOpinionSchema = z.object({
  verdict: z.enum(VERDICTS),
  extractedText: z.string().default(""),
  headline: z.string().min(1),
  reason: z.string().min(1),
  steps: z.array(z.string()).default([]),
  emergencySteps: z.array(z.string()).default([]),
  signals: z
    .array(z.object({ quote: z.string().default(""), explanation: z.string() }))
    .default([]),
});

export type AIOpinion = z.infer<typeof AIOpinionSchema>;

/** Recorta a los límites del documento en vez de rechazar (consideraciones.md 6.3). */
export function clipOpinion(o: AIOpinion): AIOpinion {
  const words = (s: string, n: number) => {
    const w = s.trim().split(/\s+/);
    return w.length <= n ? s.trim() : w.slice(0, n).join(" ") + "…";
  };
  return {
    ...o,
    headline: words(o.headline, 8),
    reason: words(o.reason, 20),
    steps: o.steps.slice(0, 3).map((s) => words(s, 12)),
    emergencySteps: o.emergencySteps.slice(0, 3).map((s) => words(s, 12)),
    signals: o.signals.slice(0, 4).map((s) => ({ quote: s.quote.slice(0, 120), explanation: words(s.explanation, 20) })),
    extractedText: o.extractedText.slice(0, 4000),
  };
}

/** Petición de la app al servidor. La IA NO recibe la puntuación del modelo (independencia, 9.1). */
export const AnalyzeRequestSchema = z
  .object({
    text: z.string().max(5000).optional(),
    imageBase64: z.string().max(8_000_000).optional(),
    imageMimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
    replyLanguage: z.enum(["en", "es"]),
    formality: z.enum(["tu", "usted"]),
  })
  .refine((r) => !!r.text?.trim() || !!r.imageBase64, { message: "text or imageBase64 required" });

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export type AnalyzeResponse =
  | { ok: true; opinion: AIOpinion; provider: string }
  | { ok: false; error: "not_configured" | "rate_limited" | "bad_request" | "ai_failed" };

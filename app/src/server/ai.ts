// SOLO SERVIDOR. Lo importa únicamente src/app/api/analyze+api.ts.
// Interfaz común de proveedor (arquitectura 9.2) + adaptador de Gemini.

import { AIOpinionSchema, clipOpinion, type AIOpinion, type AnalyzeRequest } from "../lib/ai/schema";
import { MockProvider } from "./mock-ai";

export interface AIProvider {
  secondOpinion(input: AnalyzeRequest): Promise<AIOpinion>;
}

const SYSTEM_PROMPT = `You are Sonny, a warm, patient and loyal grandson who knows a lot about scams.
You help older people who are not tech-savvy. Analyze the message (or the photo of a message)
and reply ONLY with JSON following the schema.
- If you get a photo: copy the message text you can read into "extractedText". If you cannot read
  any message, set "extractedText" to "" and "verdict" to "suspicious".
- "verdict": "scam", "suspicious" or "safe". If unsure between "suspicious" and "safe", choose "suspicious".
- "headline": at most 8 words. "reason": at most 20 words. "steps" and "emergencySteps": at most 3 items,
  each under 10 words. "emergencySteps" = what to do if they already gave their details or money.
- "signals": up to 3 short quotes copied exactly from the message, each with a simple explanation.
- Very short sentences. No technical words (never say phishing, URL, domain, credentials,
  typosquatting): say "fake link", "your password", "the website".
- Never blame the user. Never say a message is 100% safe. Never tell them to just ignore it:
  recommend checking with the official phone number.`;

function userInstruction(input: AnalyzeRequest): string {
  const lang =
    input.replyLanguage === "es"
      ? `Write all text in neutral Latin American Spanish, addressing the user as "${input.formality === "usted" ? "usted" : "tú"}". Use "celular", never "móvil". "extractedText" stays in the original language.`
      : `Write all text in English. "extractedText" stays in the original language.`;
  const what = input.imageBase64 ? "Here is a photo of the message." : `Message:\n"""\n${input.text}\n"""`;
  return `${lang}\n\n${what}`;
}

// JSON Schema que se envía a Gemini (subconjunto soportado).
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["scam", "suspicious", "safe"] },
    extractedText: { type: "string" },
    headline: { type: "string" },
    reason: { type: "string" },
    steps: { type: "array", items: { type: "string" } },
    emergencySteps: { type: "array", items: { type: "string" } },
    signals: {
      type: "array",
      items: {
        type: "object",
        properties: { quote: { type: "string" }, explanation: { type: "string" } },
        required: ["quote", "explanation"],
      },
    },
  },
  required: ["verdict", "extractedText", "headline", "reason", "steps", "emergencySteps", "signals"],
};

function parseJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  return JSON.parse(cleaned);
}

class GeminiProvider implements AIProvider {
  constructor(
    private apiKey: string,
    private model: string,
    private timeoutMs: number,
  ) {}

  private async call(input: AnalyzeRequest, structured: boolean): Promise<Response> {
    const parts: unknown[] = [];
    if (input.imageBase64) {
      parts.push({ inlineData: { mimeType: input.imageMimeType ?? "image/jpeg", data: input.imageBase64 } });
    }
    parts.push({ text: userInstruction(input) });
    const generationConfig = structured
      ? { temperature: 0.2, responseFormat: { text: { mimeType: "APPLICATION_JSON", schema: RESPONSE_SCHEMA } } }
      : { temperature: 0.2, responseMimeType: "application/json" };
    return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": this.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts }],
        generationConfig,
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
  }

  async secondOpinion(input: AnalyzeRequest): Promise<AIOpinion> {
    let lastError: unknown;
    // Intento 1: salida estructurada con esquema. Si la API no acepta ese campo (400), intento 2
    // pide JSON sin esquema (el esquema va en el prompt y lo valida zod igualmente).
    for (const structured of [true, false, false]) {
      try {
        const res = await this.call(input, structured);
        if (res.status === 400 && structured) continue;
        if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
        const data = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
        const parsed = AIOpinionSchema.safeParse(parseJson(text));
        if (parsed.success) return clipOpinion(parsed.data);
        lastError = parsed.error;
      } catch (e) {
        lastError = e;
        if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) break;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Respuesta de la IA no válida");
  }
}

export function providerName(): string {
  return (process.env.AI_PROVIDER ?? "gemini").toLowerCase();
}

export function getProvider(): AIProvider | null {
  const provider = providerName();
  if (provider === "mock") return new MockProvider(); // pruebas: sin clave ni internet
  const key = process.env.AI_API_KEY;
  if (!key) return null;
  const timeout = Number(process.env.AI_TIMEOUT_MS ?? 14000);
  switch (provider) {
    case "gemini":
      return new GeminiProvider(key, process.env.AI_MODEL || "gemini-3.8-flash", timeout);
    default:
      // anthropic | openai: la interfaz está lista; falta implementar su adaptador.
      console.warn(`[sonny] AI_PROVIDER="${provider}" no implementado; se usa solo el modelo propio.`);
      return null;
  }
}

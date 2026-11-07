// POST /api/analyze — segunda opinión de la IA (y lectura de fotos).
// La clave de la IA vive solo aquí (variables de entorno del servidor, archivo .env).
// No se guarda ningún mensaje ni foto: se procesa y se descarta.

import { AnalyzeRequestSchema, type AnalyzeResponse } from "../../lib/ai/schema";
import { getProvider, providerName } from "../../server/ai";

// Límite de peticiones por IP (consideraciones.md 9). En memoria: suficiente para el hackathon.
const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const limit = Number(process.env.RATE_LIMIT_PER_HOUR ?? 20);
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= limit) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

const json = (body: AnalyzeResponse, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

export async function POST(request: Request): Promise<Response> {
  const provider = getProvider();
  if (!provider) return json({ ok: false, error: "not_configured" }, 503);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }
  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) return json({ ok: false, error: "bad_request" }, 400);

  const ip = (request.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (rateLimited(ip)) return json({ ok: false, error: "rate_limited" }, 429);

  try {
    const opinion = await provider.secondOpinion(parsed.data);
    return json({ ok: true, opinion, provider: providerName() });
  } catch (e) {
    console.error("[sonny] IA falló:", e instanceof Error ? e.message : e);
    return json({ ok: false, error: "ai_failed" }, 502);
  }
}

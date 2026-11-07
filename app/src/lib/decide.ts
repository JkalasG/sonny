// Tabla de decisión de la cascada (arquitectura 8.2–8.4). Función pura: se prueba sin la app.

import type { Verdict } from "./templates";

export type Thresholds = { scam: number; mid: number; safe: number };

/** ¿Hay que pedir la segunda opinión? Solo si no es una estafa clara (el mensaje no sale del celular). */
export function needsAI(p: number, th: Thresholds): boolean {
  return p < th.scam;
}

/**
 * Veredicto final.
 * @param aiVerdict veredicto de la IA, o null si no hay (sin internet, falló o no se pidió).
 * @param rulesSevere las reglas de enlaces vieron algo grave.
 */
export function decide(p: number, th: Thresholds, aiVerdict: Verdict | null, rulesSevere: boolean): Verdict {
  let v: Verdict;
  if (p >= th.scam) v = "scam";
  else if (aiVerdict === null) v = p >= th.safe ? "suspicious" : "safe"; // tabla sin internet (8.2)
  else {
    v = aiVerdict;
    if (p >= th.mid && v === "safe") v = "suspicious"; // zona alta: la IA no puede bajar a ✅ (8.3)
  }
  if (rulesSevere && v === "safe") v = "suspicious"; // reglas finales (8.4)
  return v;
}

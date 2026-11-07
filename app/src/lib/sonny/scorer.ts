// GENERADO por scripts/sync-model.mjs desde modelo/js/scorer.ts. No editar aquí.
// Ejecución de un modelo .sonny (TF-IDF char_wb + regresión logística).
// Réplica exacta de lo que hace scikit-learn (ver sección 7 del documento).

import { preprocess } from "./preprocess";

export type SonnyModel = {
  format: "sonny-lr-v1";
  lang: "en" | "es" | "multi";
  task: "scam" | "lang";
  ngram_range: [number, number];
  intercept: number;
  thresholds: Record<string, number>; // scam: {scam, mid, safe} · lang: {accept}
  labels?: Record<string, string>;     // solo lang: {"0": "en", "1": "es"}
  vocab: Record<string, [number, number]>; // n-grama -> [idf, coeficiente]
  tests: Array<{ text: string; p: number }>;
};

// Réplica de TfidfVectorizer(analyzer="char_wb")._char_wb_ngrams.
// Array.from cuenta caracteres reales (un emoji ocupa 2 unidades en JS, 1 en Python).
export function charWbNgrams(text: string, minN: number, maxN: number): string[] {
  const out: string[] = [];
  for (const word of text.split(" ")) {
    if (!word) continue;
    const w = Array.from(" " + word + " ");
    const len = w.length;
    for (let n = minN; n <= maxN; n++) {
      let offset = 0;
      out.push(w.slice(offset, offset + n).join(""));
      while (offset + n < len) {
        offset++;
        out.push(w.slice(offset, offset + n).join(""));
      }
      if (offset === 0) break; // palabra más corta que n: se cuenta una sola vez
    }
  }
  return out;
}

const hasOwn = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/** Probabilidad de la clase 1 (estafa, o "es" en el detector de idioma). */
export function scoreMessage(model: SonnyModel, raw: string): number {
  const [minN, maxN] = model.ngram_range;
  const counts = new Map<string, number>();
  for (const g of charWbNgrams(preprocess(raw), minN, maxN)) {
    // hasOwn y no `in`: evita falsos aciertos con "constructor", "__proto__"...
    if (hasOwn(model.vocab, g)) counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  let norm = 0;
  const vals: Array<[number, number]> = [];
  for (const [g, c] of counts) {
    const [idf, coef] = model.vocab[g];
    const v = (1 + Math.log(c)) * idf;
    norm += v * v;
    vals.push([v, coef]);
  }
  norm = Math.sqrt(norm) || 1;
  let z = model.intercept;
  for (const [v, coef] of vals) z += (v / norm) * coef;
  return 1 / (1 + Math.exp(-z));
}

/** Detector de idioma: devuelve el idioma o null si no llega a la confianza mínima. */
export function detectLang(model: SonnyModel, raw: string): "en" | "es" | null {
  const pEs = scoreMessage(model, raw);
  const conf = Math.max(pEs, 1 - pEs);
  if (conf < (model.thresholds.accept ?? 0.8)) return null; // usar el idioma principal
  return pEs >= 0.5 ? "es" : "en";
}

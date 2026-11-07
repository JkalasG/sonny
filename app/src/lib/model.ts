// Carga perezosa de los modelos .sonny (documento de arquitectura, sección 11.1).
// En la APK van dentro del paquete; en la web se descargan una vez y el navegador los guarda.

import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import { Platform } from "react-native";

import { charWbNgrams, scoreMessage, type SonnyModel } from "./sonny/scorer";
import { preprocess } from "./sonny/preprocess";

/* eslint-disable @typescript-eslint/no-require-imports -- recursos de Metro */
const SOURCES = {
  en: require("../../assets/models/en.sonny"),
  es: require("../../assets/models/es.sonny"),
  lang: require("../../assets/models/lang.sonny"),
} as const;
/* eslint-enable @typescript-eslint/no-require-imports */

export type ModelKey = keyof typeof SOURCES;

const cache = new Map<ModelKey, Promise<SonnyModel>>();

async function readModel(key: ModelKey): Promise<SonnyModel> {
  const asset = Asset.fromModule(SOURCES[key]);
  await asset.downloadAsync();
  const raw =
    Platform.OS === "web"
      ? await (await fetch(asset.uri)).text()
      : await new File(asset.localUri ?? asset.uri).text();
  const model = JSON.parse(raw) as SonnyModel;
  if (model.format !== "sonny-lr-v1") throw new Error(`Formato de modelo desconocido: ${key}`);
  if (__DEV__) selfCheck(key, model);
  return model;
}

/** Pruebas de coincidencia en desarrollo (sección 7.4): la app calcula lo mismo que Python. */
function selfCheck(key: ModelKey, model: SonnyModel) {
  const worst = Math.max(...model.tests.map((t) => Math.abs(scoreMessage(model, t.text) - t.p)));
  if (worst >= 0.001) console.warn(`[sonny] ${key}.sonny NO coincide con Python (dif. ${worst})`);
}

export function loadModel(key: ModelKey): Promise<SonnyModel> {
  let p = cache.get(key);
  if (!p) {
    p = readModel(key);
    p.catch(() => cache.delete(key)); // reintentar la próxima vez si falló
    cache.set(key, p);
  }
  return p;
}

export type WordWeight = { word: string; weight: number };

/**
 * Explicación por palabra: cuánto empuja cada palabra del mensaje original hacia
 * estafa (> 0) o hacia normal (< 0). Reparte la contribución de cada n-grama
 * (valor TF-IDF normalizado × coeficiente) entre sus apariciones.
 */
export function explainWords(model: SonnyModel, raw: string): WordWeight[] {
  const [minN, maxN] = model.ngram_range;
  const has = (g: string) => Object.prototype.hasOwnProperty.call(model.vocab, g);

  const counts = new Map<string, number>();
  for (const g of charWbNgrams(preprocess(raw), minN, maxN)) if (has(g)) counts.set(g, (counts.get(g) ?? 0) + 1);
  let norm = 0;
  for (const [g, c] of counts) norm += ((1 + Math.log(c)) * model.vocab[g][0]) ** 2;
  norm = Math.sqrt(norm) || 1;
  const perOccurrence = new Map<string, number>();
  for (const [g, c] of counts) {
    const [idf, coef] = model.vocab[g];
    perOccurrence.set(g, (((1 + Math.log(c)) * idf) / norm) * coef / c);
  }

  return raw.split(/(\s+)/).map((word) => {
    if (!word.trim()) return { word, weight: 0 };
    let weight = 0;
    for (const g of charWbNgrams(preprocess(word), minN, maxN)) weight += perOccurrence.get(g) ?? 0;
    return { word, weight };
  });
}

// Velocidad de los modelos en JavaScript: carga (JSON.parse) y análisis por mensaje.
// Uso: node js/bench.ts   (la última línea es JSON, la lee 06_analisis.py)

import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { performance } from "node:perf_hooks";

import { scoreMessage, type SonnyModel } from "./scorer.ts";

const EXPORTS = join(dirname(fileURLToPath(import.meta.url)), "..", "exports");
const ITER = 2000;
const result: Record<string, unknown> = { node: process.versions.node, iterations: ITER, models: {} };

for (const name of ["en.sonny", "es.sonny", "lang.sonny"]) {
  const path = join(EXPORTS, name);
  const raw = readFileSync(path, "utf-8");
  const t0 = performance.now();
  const model = JSON.parse(raw) as SonnyModel;
  const loadMs = performance.now() - t0;

  const texts = model.tests.map((t) => t.text);
  for (let i = 0; i < 200; i++) scoreMessage(model, texts[i % texts.length]); // calentamiento
  const times: number[] = [];
  for (let i = 0; i < ITER; i++) {
    const s = performance.now();
    scoreMessage(model, texts[i % texts.length]);
    times.push(performance.now() - s);
  }
  times.sort((a, b) => a - b);
  (result.models as Record<string, unknown>)[name] = {
    mb: statSync(path).size / 1e6,
    load_ms: loadMs,
    median_ms: times[Math.floor(ITER / 2)],
    p99_ms: times[Math.floor(ITER * 0.99)],
  };
}

console.log(JSON.stringify(result));

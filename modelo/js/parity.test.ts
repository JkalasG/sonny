// Pruebas de coincidencia Python <-> JavaScript (sección 7.4). Obligatorias.
// Ejecutar desde modelo/:  npm test   (Node >= 22.18, sin dependencias)

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { preprocess } from "./preprocess.ts";
import { detectLang, scoreMessage, type SonnyModel } from "./scorer.ts";

const EXPORTS = join(dirname(fileURLToPath(import.meta.url)), "..", "exports");
const load = <T>(name: string): T => JSON.parse(readFileSync(join(EXPORTS, name), "utf-8"));
const TOLERANCE = 0.001;

test("preprocess coincide con Python en los casos difíciles", () => {
  const cases = load<Array<{ text: string; expected: string }>>("preprocess_cases.json");
  for (const c of cases) {
    assert.equal(preprocess(c.text), c.expected, `texto: ${JSON.stringify(c.text)}`);
  }
});

for (const name of ["en.sonny", "es.sonny", "lang.sonny"]) {
  test(`${name}: puntuaciones iguales a Python (< ${TOLERANCE})`, () => {
    const model = load<SonnyModel>(name);
    assert.equal(model.format, "sonny-lr-v1");
    assert.ok(model.tests.length >= 10, "faltan mensajes de prueba en el modelo");
    for (const t of model.tests) {
      const p = scoreMessage(model, t.text);
      assert.ok(Math.abs(p - t.p) < TOLERANCE,
        `${name}: JS=${p.toFixed(6)} Python=${t.p} texto=${JSON.stringify(t.text.slice(0, 80))}`);
    }
  });
}

test("umbrales ordenados: safe <= mid <= scam", () => {
  for (const name of ["en.sonny", "es.sonny"]) {
    const { safe, mid, scam } = load<SonnyModel>(name).thresholds;
    assert.ok(safe <= mid && mid <= scam, `${name}: ${safe} / ${mid} / ${scam}`);
  }
});

test("detector de idioma en ejemplos obvios", () => {
  const lang = load<SonnyModel>("lang.sonny");
  assert.equal(detectLang(lang, "Tu paquete está retenido, paga la tasa aquí"), "es");
  assert.equal(detectLang(lang, "Your package is on hold, pay the fee here"), "en");
});

test("ejemplos de demostración (informativo)", () => {
  const en = load<SonnyModel>("en.sonny");
  const es = load<SonnyModel>("es.sonny");
  const show = (m: SonnyModel, s: string) =>
    console.log(`  [${m.lang}] p=${scoreMessage(m, s).toFixed(3)}  ${s}`);
  show(en, "Your package is on hold. Pay $1.99 at usps-redelivery.top/pay");
  show(en, "See you at dinner on Sunday!");
  show(es, "Hola mamá, se me rompió el celular, este es mi número nuevo. Necesito que me transfieras");
  show(es, "Tu código de verificación es 482913. No lo compartas con nadie.");
  show(es, "Su cuenta ha sido bloqueada. Verifique sus datos en bancoseguro-verifica.xyz");
  show(es, "¿Vienes a comer el domingo?");
});

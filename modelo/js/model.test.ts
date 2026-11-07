// Pruebas de comportamiento del modelo en JavaScript (lo que ejecutará la app).
// Ejecutar desde modelo/:  npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { performance } from "node:perf_hooks";

import { preprocess } from "./preprocess.ts";
import { charWbNgrams, detectLang, scoreMessage, type SonnyModel } from "./scorer.ts";

const EXPORTS = join(dirname(fileURLToPath(import.meta.url)), "..", "exports");
const load = (name: string): SonnyModel =>
  JSON.parse(readFileSync(join(EXPORTS, name), "utf-8"));
const en = load("en.sonny");
const es = load("es.sonny");
const lang = load("lang.sonny");
const ZWNJ = String.fromCodePoint(0x200c);

test("las probabilidades siempre están entre 0 y 1 y son finitas", () => {
  for (const m of [en, es, lang]) {
    for (const t of ["", "a", "😀", "0000000000", "x".repeat(5000), "constructor"]) {
      const p = scoreMessage(m, t);
      assert.ok(Number.isFinite(p) && p > 0 && p < 1, `${m.lang} "${t.slice(0, 20)}" -> ${p}`);
    }
  }
});

test("un mensaje vacío da exactamente sigmoid(intercepto)", () => {
  for (const m of [en, es]) {
    assert.equal(scoreMessage(m, ""), 1 / (1 + Math.exp(-m.intercept)));
  }
});

test("el resultado es determinista", () => {
  const t = "Su cuenta ha sido bloqueada, verifique aquí: banco-seguro.xyz";
  assert.equal(scoreMessage(es, t), scoreMessage(es, t));
});

test("invariancias: mayúsculas, tildes, espacios, emojis y caracteres invisibles", () => {
  const base = "Su paquete está retenido. Pague la tasa en entregas-envio.info/pago";
  const variants = [
    base.toUpperCase(),
    base.normalize("NFKD").replace(/\p{Mn}/gu, ""),
    base.replace(/ /g, "   \n "),
    base.replace(/(\p{L}{3})/gu, `$1${ZWNJ}`),
  ];
  const p0 = scoreMessage(es, base);
  for (const v of variants) assert.equal(scoreMessage(es, v), p0, JSON.stringify(v));
});

test("cambiar el dominio o los números no cambia la puntuación (lo analizan las reglas)", () => {
  const a = "Your account is locked. Verify at bank-verify.xyz/login now, code 4821";
  const b = "Your account is locked. Verify at other-site.top/x now, code 9999";
  assert.equal(scoreMessage(en, a), scoreMessage(en, b));
});

test("n-gramas char_wb: palabras cortas y emojis como en scikit-learn", () => {
  assert.deepEqual(charWbNgrams("a", 2, 5), [" a", "a ", " a "]);
  assert.deepEqual(charWbNgrams("ab", 2, 3), [" a", "ab", "b ", " ab", "ab "]);
  assert.deepEqual(charWbNgrams("😀", 2, 2), [" 😀", "😀 "]); // 1 carácter, no 2
});

test("las claves del prototipo no cuentan como n-gramas", () => {
  const fake: SonnyModel = { ...en, vocab: {}, intercept: 0 };
  assert.equal(scoreMessage(fake, "constructor __proto__ toString"), 0.5);
});

test("preprocesado: marcadores de enlace, correo, teléfono y número", () => {
  assert.equal(preprocess("Visita https://x.co/a ya"), "visita urltok ya");
  assert.equal(preprocess("escribe a ana@mail.com"), "escribe a mailtok");
  assert.equal(preprocess("llama al +591 712-34567"), "llama al phonetok");
  assert.equal(preprocess("paga 1,99 hoy"), "paga 0,0 hoy");
  assert.equal(preprocess("aquí.Gracias"), "aqui.gracias"); // no es un enlace
});

test("estafas obvias puntúan más que mensajes normales", () => {
  const pairs: Array<[SonnyModel, string, string]> = [
    [en, "WINNER! You have won a £900 prize. Call 09061701461 to claim now", "See you at dinner on Sunday"],
    [es, "Felicidades ha ganado un premio, reclámelo aquí: premios-ya.top", "Recordatorio de su cita el día 12"],
  ];
  for (const [m, scam, legit] of pairs) {
    assert.ok(scoreMessage(m, scam) > scoreMessage(m, legit), `${m.lang}: ${scam}`);
    // Regla de seguridad (documento de arquitectura 8.4): una estafa nunca sale ✅.
    assert.ok(scoreMessage(m, scam) >= m.thresholds.safe, `${m.lang}: no puede salir ✅`);
    assert.ok(scoreMessage(m, legit) < m.thresholds.scam, `${m.lang}: lo normal no puede salir 🛑`);
  }
});

test("detector de idioma: decide o devuelve null, nunca otra cosa", () => {
  for (const t of ["", "ok", "hola", "Hola, your package", "Tu cuenta fue bloqueada", "Your account is locked"]) {
    const r = detectLang(lang, t);
    assert.ok(r === "en" || r === "es" || r === null, `${t} -> ${r}`);
  }
  assert.equal(detectLang(lang, "Tu cuenta de banco fue bloqueada, verifica tus datos"), "es");
  assert.equal(detectLang(lang, "Your bank account has been locked, verify your details"), "en");
});

test("velocidad: 1.000 análisis en menos de 1 segundo", () => {
  const texts = en.tests.map((t) => t.text);
  const t0 = performance.now();
  for (let i = 0; i < 1000; i++) scoreMessage(en, texts[i % texts.length]);
  const ms = performance.now() - t0;
  assert.ok(ms < 1000, `${ms.toFixed(0)} ms`);
});

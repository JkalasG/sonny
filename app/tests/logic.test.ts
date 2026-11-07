// Pruebas de la lógica pura de la app (sin React Native). Ejecutar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { decide, needsAI } from "../src/lib/decide.ts";
import { localExplanation } from "../src/lib/templates.ts";
import { analyzeLinks } from "../src/lib/urlAnalyzer.ts";

const th = { safe: 0.13, mid: 0.5, scam: 0.75 };

test("tabla de decisión 8.3: estafa clara no consulta a la IA y siempre es 🛑", () => {
  assert.equal(needsAI(0.9, th), false);
  assert.equal(decide(0.9, th, null, false), "scam");
  assert.equal(decide(0.9, th, "safe", false), "scam");
});

test("tabla de decisión 8.2: sin IA", () => {
  assert.equal(decide(0.6, th, null, false), "suspicious");
  assert.equal(decide(0.2, th, null, false), "suspicious");
  assert.equal(decide(0.05, th, null, false), "safe");
});

test("tabla de decisión 8.3: zona alta, la IA no puede bajar a ✅", () => {
  assert.equal(decide(0.6, th, "safe", false), "suspicious");
  assert.equal(decide(0.6, th, "scam", false), "scam");
  assert.equal(decide(0.6, th, "suspicious", false), "suspicious");
});

test("tabla de decisión 8.3: zona baja, manda la IA", () => {
  assert.equal(decide(0.3, th, "safe", false), "safe");
  assert.equal(decide(0.05, th, "scam", false), "scam"); // p.ej. "familiar en apuros"
});

test("regla 8.4: con una señal grave de enlace nunca es ✅", () => {
  assert.equal(decide(0.05, th, null, true), "suspicious");
  assert.equal(decide(0.3, th, "safe", true), "suspicious");
});

test("enlaces: typosquatting, marca en subdominio, IP, acortador, TLD de riesgo", () => {
  const kinds = (t: string) => analyzeLinks(t).links.flatMap((l) => l.signals.map((s) => s.kind));
  assert.ok(kinds("entra a paypa1.com/login").includes("lookalike"));
  assert.ok(kinds("bbva-seguridad.xyz").includes("lookalike"));
  assert.ok(kinds("https://santander.com.verificacion-segura.net/login").includes("brandInSubdomain"));
  assert.ok(kinds("http://185.23.11.4/login").includes("ip"));
  assert.ok(kinds("mira bit.ly/3xYz").includes("shortener"));
  assert.ok(kinds("pague en entregas-envio.info/pago").includes("riskyTld"));
  assert.ok(kinds("https://xn--pypal-4ve.com").includes("punycode"));
});

test("enlaces: los legítimos y el texto normal no dan señales graves", () => {
  for (const t of ["Entra a https://www.paypal.com", "Visita google.com", "Hola, nos vemos mañana.", "Gracias.Nos vemos", "Tu código es 4821"]) {
    assert.equal(analyzeLinks(t).severe, false, t);
  }
  assert.equal(analyzeLinks("Hola, nos vemos mañana.").links.length, 0);
});

test("plantillas: límites de longitud y tú/usted", () => {
  const rules = analyzeLinks("sin enlaces");
  for (const lang of ["en", "es"] as const)
    for (const f of ["tu", "usted"] as const)
      for (const v of ["scam", "suspicious", "safe"] as const) {
        const e = localExplanation(v, rules, lang, f);
        assert.ok(e.headline.split(/\s+/).length <= 8, e.headline);
        assert.ok(e.reason.split(/\s+/).length <= 20, e.reason);
        assert.ok(e.steps.length <= 3 && e.emergencySteps.length <= 3);
      }
  assert.match(localExplanation("scam", rules, "es", "usted").headline, /abra/);
  assert.match(localExplanation("scam", rules, "es", "tu").headline, /abras/);
});

test("plantillas: con señal grave, la razón explica el enlace", () => {
  const e = localExplanation("scam", analyzeLinks("paypa1.com/login"), "es", "tu");
  assert.match(e.reason, /PAYPAL/);
});

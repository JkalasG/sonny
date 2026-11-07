// Prepara el OCR de la web (leer el texto de una foto en el navegador, sin IA y sin internet).
// Copia tesseract.js desde node_modules y descarga los idiomas inglés y español a public/ocr/,
// que la web sirve como archivos estáticos. src/lib/ocr.web.ts los carga solo cuando hace falta.
// Uso: npm run sync-ocr   (una vez, o después de actualizar tesseract.js)

import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(APP, "public", "ocr");
const NM = join(APP, "node_modules");
mkdirSync(join(OUT, "core"), { recursive: true });
mkdirSync(join(OUT, "lang"), { recursive: true });

const copy = (from, to) => {
  copyFileSync(join(NM, from), join(OUT, to));
  console.log(`  ${from} -> public/ocr/${to}`);
};
copy("tesseract.js/dist/tesseract.min.js", "tesseract.min.js");
copy("tesseract.js/dist/worker.min.js", "worker.min.js");
// tesseract.js elige la variante según el navegador (SIMD o no); solo usamos el motor LSTM.
for (const v of ["tesseract-core-lstm", "tesseract-core-simd-lstm", "tesseract-core-relaxedsimd-lstm"]) {
  copy(`tesseract.js-core/${v}.wasm.js`, `core/${v}.wasm.js`);
}

for (const lang of ["eng", "spa"]) {
  const dst = join(OUT, "lang", `${lang}.traineddata.gz`);
  if (existsSync(dst)) continue;
  const url = `https://cdn.jsdelivr.net/npm/@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  writeFileSync(dst, Buffer.from(await res.arrayBuffer()));
  console.log(`  ${url} -> public/ocr/lang/${lang}.traineddata.gz`);
}

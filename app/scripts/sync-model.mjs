// Copia a la app lo que genera ../modelo (única fuente de verdad):
//   modelo/exports/*.sonny            -> assets/models/
//   modelo/js/preprocess.ts, scorer.ts -> src/lib/sonny/   (ajustando los imports)
//   modelo/reports/analisis.json, invisibles_antes.json, figuras/*.png -> assets/report/
// Uso: npm run sync-model   (después de reentrenar en ../modelo)

import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..");
const MODELO = join(APP, "..", "modelo");

function copy(from, to) {
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  console.log(`  ${from.replace(MODELO, "modelo")} -> ${to.replace(APP, "app")}`);
}

for (const name of ["en.sonny", "es.sonny", "lang.sonny"]) {
  copy(join(MODELO, "exports", name), join(APP, "assets", "models", name));
}

mkdirSync(join(APP, "src", "lib", "sonny"), { recursive: true });
for (const name of ["preprocess.ts", "scorer.ts"]) {
  const src = readFileSync(join(MODELO, "js", name), "utf-8")
    // Node necesita la extensión .ts; Metro/TypeScript de Expo no.
    .replace(/from "\.\/preprocess\.ts"/g, 'from "./preprocess"');
  const header = `// GENERADO por scripts/sync-model.mjs desde modelo/js/${name}. No editar aquí.\n`;
  writeFileSync(join(APP, "src", "lib", "sonny", name), header + src);
  console.log(`  modelo/js/${name} -> app/src/lib/sonny/${name}`);
}

for (const name of ["analisis.json", "invisibles_antes.json"]) {
  copy(join(MODELO, "reports", name), join(APP, "assets", "report", name));
}
for (const name of readdirSync(join(MODELO, "reports", "figuras"))) {
  if (name.endsWith(".png")) copy(join(MODELO, "reports", "figuras", name), join(APP, "assets", "report", name));
}
console.log("Listo.");

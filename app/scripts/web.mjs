// Arranca la web en local forzando la IA simulada, sin tocar .env.
// Uso:
//   node scripts/web.mjs mock              (npm run web:mock)
//   node scripts/web.mjs mock fail         (npm run web:mock:fail)  -> la IA falla
//   node scripts/web.mjs mock slow|scam|suspicious|safe|unreadable
// Las variables puestas aquí tienen prioridad sobre las de .env.

import { spawn } from "node:child_process";

const [, , mode = "mock", scenario = "auto"] = process.argv;
const env = { ...process.env };
if (mode === "mock") {
  env.AI_PROVIDER = "mock";
  env.AI_MOCK_SCENARIO = scenario;
  console.log(`\n🧪 Sonny en modo de prueba: AI_PROVIDER=mock, AI_MOCK_SCENARIO=${scenario}\n`);
}

const child = spawn("npx", ["expo", "start", "--web", ...process.argv.slice(4)], {
  stdio: "inherit",
  env,
  shell: process.platform === "win32", // npx es npx.cmd en Windows
});
child.on("exit", (code) => process.exit(code ?? 0));

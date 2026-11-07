# Sonny — app (Expo SDK 58: web + Android)

*"El nieto que nunca te deja solo ante una estafa."*

La app pegada a los modelos de [`../modelo/`](../modelo/README.md). Diseño: [`../Sonny_Modelo_y_Arquitectura.md`](../Sonny_Modelo_y_Arquitectura.md) y [`../consideraciones.md`](../consideraciones.md).

## Correr en local

**Requisitos:** Node 22.18 o superior (probado con Node 24) y npm. Para la parte de `modelo/`: Python 3.10 o superior.

### Primera vez

```bash
cd app
npm install
# .env ya existe (es una copia de .env.example). Si no existiera:  cp .env.example .env
```

### Tres formas de arrancar la web

| Comando | IA | Para qué |
|---|---|---|
| `npm run web:mock` | **Simulada** (sin clave ni internet) | Probar toda la app y hacer demos. En "¿Por qué?" se indica que la segunda opinión es simulada |
| `npm run web` | La que diga `.env` (`AI_PROVIDER`) | Uso normal. Con `AI_PROVIDER=gemini` + `AI_API_KEY` es la IA real |
| `npm run web` sin clave | Ninguna | Solo el **modelo propio + reglas**, como sin internet. Las fotos se leen con el OCR del navegador (`public/ocr/`) |

Después abre **http://localhost:8081**. Para pararlo: `Ctrl + C`.

**Probar en el celular** (misma red Wi-Fi): abre `http://<IP-de-tu-computadora>:8081` en el navegador del celular. La IP sale con `ipconfig` (Windows) o `ifconfig` (macOS/Linux).

### Modo de prueba (IA simulada)

`AI_PROVIDER=mock` sustituye **solo a Gemini** (la segunda opinión) por un simulador (`src/server/mock-ai.ts`). **El modelo propio funciona exactamente igual**: analiza primero cada mensaje en el dispositivo, y si la estafa es clara el simulador ni se llama. El simulador decide con palabras clave para poder recorrer todos los caminos de la cascada, y su respuesta pasa por la misma tabla de decisión que Gemini (por ejemplo, en la zona alta no puede bajar a ✅). Con una foto, el simulador no la lee: la app lee el texto en el propio equipo (OCR) y le pide la opinión sobre ese texto real. Reconoce también la estafa del "familiar en apuros" ("se me rompió el celular, este es mi número nuevo").

| Comando | Escenario | Qué deberías ver |
|---|---|---|
| `npm run web:mock` | `auto` | Veredictos según palabras clave |
| `npm run web:mock:fail` | `fail` | La IA falla → "No pude pedir una segunda opinión: revisión básica." |
| `npm run web:mock:slow` | `slow` | La IA tarda más de 15 s → la app deja de esperar y usa el modelo propio |
| `node scripts/web.mjs mock scam` | `scam` / `suspicious` / `safe` | La IA da siempre ese veredicto (útil para ver la regla "en zona alta la IA no baja a ✅") |
| `node scripts/web.mjs mock unreadable` | `unreadable` | Igual que `auto` (el simulador nunca lee fotos; las lee el OCR del equipo) |

Los comandos `web:mock*` **tienen prioridad sobre `.env`** y no lo modifican. También puedes fijar el modo en `.env` con `AI_PROVIDER=mock` y `AI_MOCK_SCENARIO=…`.

### Pasar a la IA real (Gemini)

1. Saca una clave en https://aistudio.google.com/apikey
2. En `app/.env`: `AI_PROVIDER=gemini` y `AI_API_KEY=tu_clave`
3. `npm run web` (reinícialo: las variables se leen al arrancar)

### Qué probar (lista rápida)

1. Primera vez: elegir English o Español (y tú/usted) → Empezar.
2. **Probar ejemplos** → tocar el del premio → 🛑. Tocar "¿Vienes a comer el domingo?" → ✅ o ⚠️.
3. **¿Por qué?** → palabras resaltadas en naranja/azul y lo que vieron las reglas en los enlaces.
4. Escribir `entra a paypa1.com/login` → las reglas detectan la marca falsa: nunca sale ✅.
5. **Ajustes** → Modo detallado: el resultado muestra `p`, los umbrales y qué IA se usó.
6. **📊 ¿Qué tan bien funciona Sonny?** → página de resultados + demo en vivo + botón del ataque invisible.
7. Con `npm run web:mock:fail`: cualquier mensaje → aviso de revisión básica.

## Variables de entorno (`.env`)

Todas en un solo archivo, `app/.env` (ignorado por git). La plantilla es [`.env.example`](.env.example).

| Variable | Dónde se usa | Para qué |
|---|---|---|
| `AI_PROVIDER` | Servidor | `gemini` |
| `AI_API_KEY` | Servidor | Clave de Gemini. **Nunca** llega al cliente (comprobado en el bundle) |
| `AI_MODEL` | Servidor | `gemini-3.8-flash` por defecto |
| `AI_TIMEOUT_MS` | Servidor | Espera máxima de la IA (14 000) |
| `RATE_LIMIT_PER_HOUR` | Servidor | Análisis con IA por IP y hora (20) |
| `EXPO_PUBLIC_API_URL` | App | Solo para la APK: URL del despliegue web. No es secreta |

## Comandos

```bash
npm run web          # desarrollo en el navegador (carga .env y la API route)
npm run web:mock     # igual, con la IA simulada (también web:mock:fail y web:mock:slow)
npm test             # 9 pruebas: tabla de decisión de la cascada, reglas de enlaces, plantillas
npm run typecheck    # TypeScript
npx eslint src       # lint
npm run sync-model   # copia modelos, scorer y análisis desde ../modelo (tras reentrenar)
npx expo export --platform web   # build web en dist/
```

**Despliegue** (cuando tengas cuenta de Expo):

```bash
npx eas-cli@latest login
npx eas-cli@latest deploy --prod                       # web + API en EAS Hosting
# Variables del servidor en producción: panel de EAS o `eas env:create` (expo-server no lee .env)
npx eas-cli@latest build -p android --profile preview  # APK (pon EXPO_PUBLIC_API_URL antes)
```

## Estructura

```
app/
├── .env / .env.example
├── app.json, eas.json, metro.config.js   # metro trata .sonny como recurso
├── assets/
│   ├── models/          # en.sonny, es.sonny, lang.sonny   (npm run sync-model)
│   └── report/          # analisis.json + figuras para /model (npm run sync-model)
├── scripts/sync-model.mjs
├── tests/logic.test.ts
└── src/
    ├── app/                       # pantallas (Expo Router)
    │   ├── _layout.tsx            # Stack sin cabecera + providers
    │   ├── welcome.tsx            # primera vez: idioma (English por defecto) y tú/usted
    │   ├── index.tsx              # inicio: foto · captura · pegar/escribir
    │   ├── result.tsx             # veredicto grande + "¿Qué hago ahora?" + "¿Por qué?" + Escuchar
    │   ├── steps.tsx              # pasos 1·2·3 + "¿Ya diste tus datos?"
    │   ├── why.tsx                # palabras que pesan, señales de enlaces y de la IA
    │   ├── settings.tsx           # idioma, tú/usted, voz, modo detallado
    │   ├── examples.tsx           # ejemplos para el jurado
    │   ├── model.tsx              # página de resultados del modelo + demo en vivo
    │   └── api/analyze+api.ts     # segunda opinión (servidor)
    ├── components/ui.tsx          # botones de 64 px, tarjetas, veredicto, avatar
    ├── lib/
    │   ├── cascade.ts             # la cascada de dos filtros
    │   ├── decide.ts              # tabla de decisión (pura, con pruebas)
    │   ├── model.ts               # carga de .sonny + explicación por palabra
    │   ├── sonny/                 # GENERADO desde modelo/js (preprocess, scorer)
    │   ├── urlAnalyzer.ts         # reglas de enlaces (F5)
    │   ├── templates.ts           # explicaciones locales EN / ES tú / usted
    │   ├── i18n.ts, settings.tsx, theme.ts, media.ts, analysis-store.tsx, use-run-analysis.ts
    │   └── ai/schema.ts           # contrato de la IA (zod), compartido
    └── server/ai.ts               # SOLO servidor: interfaz de proveedor + adaptador Gemini
```

## Cómo decide (resumen)

1. Detector de idioma → Sonny-EN o Sonny-ES → probabilidad `p`, más las reglas de enlaces.
2. `p ≥ T_SCAM` → 🛑, **el mensaje no sale del dispositivo**.
3. Si no, con internet: segunda opinión de Gemini, **sin enviarle `p`**. En la zona alta (`p ≥ T_MID`) la IA no puede bajar a ✅.
4. Sin internet o si la IA falla: `p ≥ T_SAFE` → ⚠️, si no → ✅.
5. Si las reglas ven un enlace grave (marca falsa, IP, punycode, marca en subdominio), nunca ✅.

## Pendiente

- Probar con una clave real de Gemini. El adaptador prueba primero la salida estructurada (`responseFormat`) y, si la API la rechaza, pide JSON sin esquema; `zod` valida siempre.
- Contacto de confianza ("Llamar a…"), "Léemelo" (voz a texto), historial.
- Medir en un Android real (APK).

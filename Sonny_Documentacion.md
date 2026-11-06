# Sonny — El nieto que nunca te deja solo ante una estafa

> **Hackathon:** Next Byte Hacks V5 (Devpost)
> **Cierre de envíos:** 7 de noviembre de 2026, 5:00 pm EST
> **Plataforma:** Expo (React Native) con exportación web
> **Slogan:** *"El nieto que nunca te deja solo ante una estafa."*
> **Slogan en inglés (Devpost y vídeo):** *"The grandson who never leaves you alone against a scam."*
> **Frase de acción dentro de la app:** *"Antes de pulsar, pregúntale a Sonny."*

---

## 1. Resumen de la idea

Sonny es una aplicación que actúa como **un nieto fiel, paciente y siempre disponible**: cualquier persona mayor puede preguntarle en segundos si un mensaje que ha recibido (SMS, WhatsApp, correo, carta o captura de pantalla) es una estafa.

El nombre no es casual: en inglés, *"sonny"* es la forma cariñosa con la que una persona mayor llama a un chaval joven ("hijo", "muchacho"). Sonny habla en primera persona, con cariño y sin tecnicismos, como lo haría un nieto de confianza.

El usuario pega el texto o sube una captura, y la app devuelve:

- Un **veredicto tipo semáforo** (estafa probable / sospechoso / parece seguro).
- Las **señales de alarma resaltadas** dentro del propio mensaje.
- Una **explicación en lenguaje sencillo** de por qué es peligroso.
- **Qué hacer ahora**, con pasos concretos.

Está pensada especialmente para **personas mayores y personas con poca experiencia digital**, que son los objetivos más frecuentes de este tipo de fraudes, pero es útil para cualquiera.

---

> 📌 *El rediseño pensado para personas mayores (foto, voz, una sola frase de respuesta, llamar a un familiar) está detallado en `consideraciones.md`. Cuando ambos documentos no coincidan, manda `consideraciones.md`.*

---

## 1.1 La personalidad de Sonny

Sonny no es una herramienta fría: es **un nieto**. Eso se nota en cómo habla.

| Rasgo | Cómo se traduce |
|---|---|
| **Fiel** | Siempre está, a cualquier hora, y nunca se cansa de que le pregunten. |
| **Paciente** | Repite las veces que haga falta. Nunca dice "ya te lo expliqué". |
| **Cariñoso** | Habla en primera persona, con calidez: *"Tranquilo, yo lo miro."* |
| **Protector** | Ante la duda, siempre aconseja esperar y preguntar. |
| **Sin juzgar** | Nunca hace sentir torpe a nadie: *"Has hecho muy bien en preguntarme."* |

**Ejemplos de cómo responde Sonny:**

- 🛑 Estafa: *"No lo abras, ¿vale? Esto es una estafa. Se hacen pasar por tu banco para quitarte dinero."*
- ⚠️ Dudoso: *"Espera un momento, esto no me cuadra. Mejor no hagas nada y lo preguntamos."*
- ✅ Normal: *"Esto parece normal. Pero ya sabes: tus claves, nunca a nadie."*
- Al terminar: *"Has hecho muy bien en preguntarme. Para eso estoy."*
- Mientras analiza: *"Déjame mirarlo… un momento."*

---

## 2. El problema

- Las estafas por SMS (*smishing*), WhatsApp y correo (*phishing*) son cada vez más creíbles: imitan a bancos, empresas de paquetería, organismos públicos o incluso a familiares ("Hola mamá, se me ha roto el móvil…").
- Las víctimas suelen actuar bajo **presión y urgencia**, sin tiempo para pensar ni nadie a quien preguntar.
- Las personas mayores muchas veces **no saben identificar** un enlace falso y **les da vergüenza preguntar**.
- Las herramientas existentes (filtros de spam, antivirus) funcionan en segundo plano y **no explican nada**: el usuario no aprende a reconocer la próxima estafa.

> 📌 *Para el vídeo y la página de Devpost: añadir una cifra oficial de fraude en vuestro país (por ejemplo, de la policía, el banco central o el organismo de consumo), citando la fuente.*

---

## 3. Público objetivo

| Usuario | Necesidad |
|---|---|
| Personas mayores | Saber si un mensaje es fiable sin depender de nadie, con letra grande y voz |
| Familiares (hijos, nietos) | Ayudar a revisar mensajes sospechosos a distancia |
| Personas con baja alfabetización digital | Explicaciones simples, sin tecnicismos |
| Inmigrantes / turistas | Mensajes en un idioma que no dominan |
| Público general | Comprobación rápida antes de pulsar un enlace |

---

## 4. Funcionalidades

### 4.1 Funcionalidades principales (MVP — obligatorias)

#### F1. Entrada del mensaje
- **Pegar texto:** un campo grande donde pegar el SMS, WhatsApp o correo. Botón "Pegar" que lee el portapapeles directamente.
- **Subir captura:** seleccionar una imagen de la galería (o hacer una foto en móvil). La IA lee el texto de la imagen y también analiza elementos visuales (logos falsos, formato).
- **Ejemplos de prueba:** tres botones con mensajes de ejemplo (una estafa, uno dudoso, uno legítimo) para que el jurado pueda probar la app sin tener mensajes reales.

#### F2. Veredicto tipo semáforo
Resultado principal, grande y visible:

| Nivel | Color | Significado |
|---|---|---|
| 🔴 **Estafa probable** | Rojo | Varias señales graves. No interactuar. |
| 🟡 **Sospechoso** | Amarillo | Algunas señales. Verificar por un canal oficial. |
| 🟢 **Parece seguro** | Verde | Sin señales relevantes. Aun así, precaución. |

Incluye una **puntuación de riesgo de 0 a 100** y el **tipo de estafa** detectado (por ejemplo: suplantación bancaria, falso paquete, "hijo en apuros", falso premio, falsa oferta de empleo, inversión fraudulenta).

#### F3. Señales resaltadas en el mensaje
El texto original se muestra con las partes peligrosas **subrayadas en color**. Al tocar cada una se explica qué significa:

- ⏰ **Urgencia:** "tu cuenta será bloqueada en 24 h".
- 🔗 **Enlace sospechoso:** dominio que imita a una marca.
- 🔑 **Petición de datos:** contraseñas, códigos SMS, PIN, datos de tarjeta.
- 🎭 **Suplantación:** se hace pasar por banco, Correos, Hacienda, un familiar…
- 💸 **Petición de dinero:** transferencias, Bizum, tarjetas regalo, criptomonedas.
- 🎁 **Promesa demasiado buena:** premios, herencias, ganancias garantizadas.
- ✍️ **Errores de redacción** o saludos genéricos ("Estimado cliente").

#### F4. Explicación y qué hacer ahora
- Explicación de **2–3 frases en lenguaje sencillo**: por qué el mensaje es peligroso.
- **Lista de acciones concretas** según el tipo de estafa. Ejemplos:
  - "No pulses el enlace."
  - "Llama a tu banco al número que aparece en tu tarjeta, no al del mensaje."
  - "Si ya has dado tus datos, bloquea tu tarjeta ahora."
  - "Si dice ser tu hijo con un número nuevo, llámale a su número de siempre."

### 4.2 Funcionalidades diferenciadoras

#### F5. Análisis de enlaces con reglas propias
Además de la IA, la app analiza localmente cada URL del mensaje con reglas programadas (esto aporta **profundidad técnica** y no depende solo del modelo):

- **Typosquatting:** dominios parecidos a marcas conocidas (`bbva-seguridad.xyz`, `correos-envio.info`, `paypa1.com`), usando distancia de Levenshtein contra una lista de marcas.
- **Dominios de nivel superior de riesgo:** `.xyz`, `.top`, `.click`, `.info`, etc.
- **Acortadores de URL:** `bit.ly`, `tinyurl`, etc. (ocultan el destino real).
- **IP en lugar de dominio:** `http://185.23.11.4/login`.
- **Sin HTTPS.**
- **Subdominios engañosos:** `santander.com.verificacion-segura.net` (la marca aparece, pero el dominio real es otro).
- **Caracteres raros o punycode:** `xn--` (letras que parecen latinas pero no lo son).

Cada regla suma puntos al riesgo y se muestra al usuario como señal explicada.

#### F6. Modo accesible (personas mayores)
- Interruptor **"Modo fácil"**: letra grande, botones grandes, alto contraste, menos información en pantalla.
- **Lectura en voz alta** del veredicto y de las acciones recomendadas.
- Lenguaje aún más simple.

#### F7. "Pregúntale a tu familia"
- Botón que **comparte por WhatsApp** (u otra app) un resumen: el mensaje sospechoso, el veredicto y las señales.
- Así un hijo o nieto puede confirmar antes de que la persona actúe.
- Rompe la **vergüenza de preguntar**, porque la app ya ha hecho el trabajo.

#### F8. Multidioma
- La app detecta el idioma del mensaje y responde en el **idioma elegido por el usuario** (español e inglés como mínimo).
- Útil para mensajes recibidos en un idioma que el usuario no domina.

### 4.3 Funcionalidades opcionales (si sobra tiempo)

- **F9. Historial local:** últimos análisis guardados en el dispositivo (sin enviar nada a ningún servidor).
- **F10. Mini-curso "Aprende a detectarlas":** 5 tarjetas con los tipos de estafa más comunes.
- **F11. Modo quiz:** "¿Es estafa o no?" con mensajes reales, para entrenar al usuario.

### 4.4 Futuro (para mencionar en el vídeo, no construir)

- Integración directa con el menú "Compartir" del móvil: compartir un SMS a Sonny sin copiar ni pegar.
- Alianzas con bancos y asociaciones de mayores.
- Base de datos colaborativa de estafas reportadas.
- Análisis de llamadas de voz (*vishing*).

---

## 5. Flujo del usuario

```
[Pantalla inicio]
   │
   ├── Pegar texto ──────┐
   ├── Subir captura ────┼──► [Analizando…] ──► [Resultado]
   └── Probar ejemplo ───┘                         │
                                                   ├── Semáforo + puntuación
                                                   ├── Mensaje con señales resaltadas
                                                   ├── Explicación sencilla
                                                   ├── Qué hacer ahora
                                                   ├── 🔊 Escuchar
                                                   ├── 📤 Pregúntale a tu familia
                                                   └── 🔄 Analizar otro mensaje
```

---

## 6. Pantallas

| Pantalla | Contenido |
|---|---|
| **Inicio** | Logo, lema, campo de texto grande, botones "Pegar", "Subir captura", ejemplos de prueba, interruptor "Modo fácil", selector de idioma |
| **Analizando** | Animación breve con mensajes ("Revisando enlaces…", "Buscando señales de urgencia…") |
| **Resultado** | Semáforo, puntuación, tipo de estafa, mensaje resaltado, explicación, acciones, botones de voz y compartir |
| **Aprende** *(opcional)* | Tarjetas sobre tipos de estafa |
| **Historial** *(opcional)* | Lista de análisis anteriores |

---

## 7. Arquitectura técnica

### 7.1 Stack

| Capa | Tecnología |
|---|---|
| Framework | **Expo** (React Native) con **Expo Router** |
| Lenguaje | TypeScript |
| Plataforma principal | **Web** (exportada con Expo), funcionando también en Android/iOS |
| Estilos | StyleSheet de React Native (o NativeWind si se prefiere Tailwind) |
| Backend | **API route de Expo Router** (`app/api/analyze+api.ts`) |
| IA | API de un modelo con visión (Claude, OpenAI o Gemini) |
| Despliegue | **EAS Hosting** (`eas deploy`) — admite la web y las API routes juntas. Alternativa: Vercel |
| Código | Repositorio público en GitHub |

### 7.2 Por qué Expo

- **Un solo código** para web, Android e iOS.
- Exportación web optimizada y comprimida con `npx expo export --platform web`.
- El jurado puede **probar la app desde el navegador** sin instalar nada.
- En el futuro se puede publicar en las tiendas sin reescribir la app.

### 7.3 Diagrama

```
┌──────────────────────────────┐
│   Cliente (Expo — web/móvil) │
│                              │
│  • Interfaz                  │
│  • Análisis local de URLs    │──┐
│    (reglas F5)               │  │
│  • Voz (expo-speech)         │  │  POST /api/analyze
│  • Compartir (WhatsApp)      │  │  { texto | imagen, idioma }
└──────────────────────────────┘  │
                                  ▼
                  ┌──────────────────────────────┐
                  │  API route (servidor Expo)   │
                  │  • Guarda la clave de la API │
                  │  • Llama al modelo de IA     │
                  │  • Valida la respuesta JSON  │
                  └──────────────┬───────────────┘
                                 ▼
                  ┌──────────────────────────────┐
                  │   Modelo de IA con visión    │
                  └──────────────────────────────┘
```

> ⚠️ **La clave de la API nunca debe estar en el código del cliente.** Siempre en el servidor, en variables de entorno, y fuera del repositorio (`.env` en `.gitignore`).

### 7.4 Estructura de carpetas

```
sonny/
├── app/
│   ├── _layout.tsx           # Navegación y tema
│   ├── index.tsx             # Pantalla de inicio
│   ├── result.tsx            # Pantalla de resultado
│   ├── learn.tsx             # (opcional) Aprende
│   └── api/
│       └── analyze+api.ts    # Endpoint que llama a la IA
├── components/
│   ├── TrafficLight.tsx      # Semáforo
│   ├── HighlightedMessage.tsx# Mensaje con señales resaltadas
│   ├── SignalCard.tsx        # Explicación de cada señal
│   ├── ActionList.tsx        # Qué hacer ahora
│   └── EasyModeToggle.tsx    # Modo fácil
├── lib/
│   ├── urlAnalyzer.ts        # Reglas de análisis de enlaces (F5)
│   ├── brands.ts             # Lista de marcas para typosquatting
│   ├── prompt.ts             # Prompt del sistema para la IA
│   ├── scoring.ts            # Combina puntuación de IA + reglas
│   └── i18n.ts               # Textos en español e inglés
├── assets/
├── .env.example              # Plantilla de variables (sin claves reales)
├── app.json
├── package.json
└── README.md                 # Instrucciones de instalación (obligatorio)
```

### 7.5 Dependencias principales

| Paquete | Uso |
|---|---|
| `expo-router` | Navegación y API routes |
| `expo-image-picker` | Subir capturas |
| `expo-clipboard` | Botón "Pegar" |
| `expo-speech` | Lectura en voz alta |
| `expo-linking` | Compartir por WhatsApp (`https://wa.me/?text=…`) |
| `@react-native-async-storage/async-storage` | Historial local (opcional) |
| SDK del modelo de IA | Llamada al modelo desde el servidor |

### 7.6 Contrato de la API

**Petición** — `POST /api/analyze`

```json
{
  "text": "Su paquete está retenido. Pague 1,99€ en: correos-envio.info/pago",
  "imageBase64": null,
  "language": "es"
}
```

**Respuesta**

```json
{
  "verdict": "scam",
  "riskScore": 92,
  "scamType": "Falso paquete retenido",
  "extractedText": "Su paquete está retenido...",
  "signals": [
    {
      "type": "suspicious_link",
      "quote": "correos-envio.info/pago",
      "explanation": "El enlace imita a Correos, pero no es su web oficial."
    },
    {
      "type": "money_request",
      "quote": "Pague 1,99€",
      "explanation": "Piden un pago pequeño para robar los datos de tu tarjeta."
    }
  ],
  "summary": "Es una estafa común: se hacen pasar por una empresa de envíos para robar los datos de tu tarjeta.",
  "actions": [
    "No pulses el enlace.",
    "Si esperas un paquete, consulta el seguimiento en la web oficial escribiéndola tú mismo.",
    "Si ya pagaste, llama a tu banco y bloquea la tarjeta."
  ]
}
```

Valores posibles de `verdict`: `scam`, `suspicious`, `safe`.

### 7.7 Puntuación final

La puntuación combina las dos fuentes para que el resultado sea más fiable:

```
puntuación_final = máx(puntuación_IA, puntuación_reglas_URL)
```

Si las reglas locales detectan algo grave (por ejemplo, typosquatting de un banco), el veredicto nunca puede ser "seguro", aunque la IA se equivoque.

### 7.8 Prompt del sistema (borrador)

> Eres Sonny, un nieto cariñoso, paciente y fiel que sabe mucho de estafas. Hablas en primera persona y ayudas a personas sin conocimientos técnicos, especialmente personas mayores, a detectar estafas. Analiza el mensaje recibido y responde **solo** con JSON siguiendo el esquema indicado. Cita textualmente los fragmentos sospechosos en `quote`. Explica todo en frases cortas y sencillas, sin tecnicismos, en el idioma `{language}`. No inventes señales: si el mensaje parece legítimo, dilo. Nunca indiques que un mensaje es 100 % seguro.

---

## 8. Privacidad y responsabilidad

- **No se guardan mensajes en ningún servidor.** El análisis se procesa y se descarta.
- El historial (si se implementa) vive solo en el dispositivo del usuario.
- Aviso visible: *"Sonny es una ayuda, no una garantía. Ante la duda, contacta siempre con la entidad por su canal oficial."*
- Recomendar al usuario que **tape datos personales** en las capturas antes de subirlas.

---

## 9. Comandos clave

```bash
# Crear el proyecto
npx create-expo-app@latest sonny
cd sonny

# Instalar dependencias
npx expo install expo-image-picker expo-clipboard expo-speech expo-linking

# Desarrollo en el navegador
npx expo start --web

# Exportar la versión web optimizada
npx expo export --platform web

# Desplegar (web + API) en EAS Hosting
npx eas-cli deploy
```

En `app.json`, para que funcionen las API routes:

```json
{
  "expo": {
    "web": { "output": "server" }
  }
}
```

---

## 10. Plan de trabajo hasta el cierre

| Horas | Tarea | Resultado |
|---|---|---|
| 0–2 | Crear proyecto Expo, repositorio GitHub, primer despliegue | Web vacía publicada |
| 2–5 | API route + prompt + llamada a la IA | Análisis de texto funcionando |
| 5–8 | Pantalla de resultado: semáforo, señales resaltadas, acciones | Flujo principal completo |
| 8–10 | Subida de capturas + reglas de URL (F5) | Diferenciador técnico listo |
| 10–12 | Modo fácil, voz, compartir por WhatsApp, idiomas | Accesibilidad lista |
| 12–14 | Pulir diseño, probar con mensajes reales, corregir errores | Versión estable |
| 14–17 | Grabar y editar el vídeo, capturas, página de Devpost | Material de envío |
| 17+ | Margen de seguridad | **Enviar al menos 2 h antes del cierre** |

---

## 11. Guion del vídeo (2–3 minutos)

| Tiempo | Contenido |
|---|---|
| 0:00–0:15 | **Gancho:** mostrar un SMS de estafa real. "Mi abuela casi pierde sus ahorros por este mensaje. Yo no siempre puedo estar ahí… pero Sonny sí." |
| 0:15–0:35 | **Problema:** cifra oficial de fraude en vuestro país y por qué afecta a los mayores. |
| 0:35–2:00 | **Demo:** tres casos (estafa clara, dudoso, legítimo). Mostrar semáforo, señales resaltadas, voz y botón de familia. |
| 2:00–2:25 | **Cómo funciona:** Expo + IA con visión + reglas propias de análisis de enlaces. |
| 2:25–2:45 | **Impacto y futuro:** compartir directo desde el móvil, alianzas con bancos, más idiomas. |
| 2:45–2:50 | **Cierre:** logo y slogan: *"Sonny. El nieto que nunca te deja solo ante una estafa."* |

> El vídeo de Devpost debe durar **entre 1 y 3 minutos**. Mantenerlo en 2–3 min cumple también las reglas de 2–5 min.

---

## 12. Checklist de envío a Devpost

- [ ] App desplegada y accesible por URL pública
- [ ] Repositorio público en GitHub con `README.md` e instrucciones de instalación
- [ ] `.env` fuera del repositorio; `.env.example` incluido
- [ ] Vídeo de demostración (2–3 min) subido a YouTube (público o no listado)
- [ ] Al menos 3 capturas de pantalla
- [ ] Página de Devpost con: descripción, problema, funcionalidades, tecnologías usadas, retos, lo aprendido y planes de futuro
- [ ] Miembros del equipo añadidos al proyecto
- [ ] Enviado antes del **7 de noviembre de 2026, 5:00 pm EST**

---

## 13. Encaje con los criterios de evaluación

| Criterio | Cómo lo cubre Sonny |
|---|---|
| **Impacto** (criterio principal en Devpost) | Protege a personas vulnerables frente a un fraude real y frecuente |
| Innovación y creatividad | Un "nieto digital" con personalidad propia: combina IA + reglas propias, voz y el botón para llamar a un familiar |
| Complejidad técnica | App multiplataforma con Expo, API en servidor, visión por computador y análisis de URLs propio |
| Funcionalidad y ejecución | Desplegada en web, se prueba en segundos con los ejemplos incluidos |
| Presentación y claridad | Problema que se entiende al instante y demo visual con semáforo |

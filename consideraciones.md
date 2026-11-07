# Sonny — Consideraciones

> *"El nieto que nunca te deja solo ante una estafa."*
>
> Complemento de `Sonny_Documentacion.md`.
> Recoge el rediseño **pensado primero para personas mayores** y todos los aspectos que faltaban: técnicos, legales, de riesgo, de pruebas y del propio hackathon.
>
> **Orden de prioridad:** `Sonny_Modelo_y_Arquitectura.md` > **este documento** > `Sonny_Documentacion.md`. Las secciones que el documento de arquitectura cambió están marcadas con 🔁: la voz (2.3), el trato (3.1), el contrato y el prompt de la IA (6.1, 6.2), la regla de palabras clave (8.1), los errores sin conexión (8.3, 8.4) y el idioma de la app (12).

---

## Índice

1. [Principio rector: diseñado para mayores](#1-principio-rector-diseñado-para-mayores)
2. [Cambios en la experiencia de usuario](#2-cambios-en-la-experiencia-de-usuario)
3. [Lenguaje y tono](#3-lenguaje-y-tono)
4. [Diseño visual y accesibilidad](#4-diseño-visual-y-accesibilidad)
5. [Nuevo flujo y pantallas](#5-nuevo-flujo-y-pantallas)
6. [Cambios técnicos derivados](#6-cambios-técnicos-derivados)
7. [Limitaciones de Expo en la web](#7-limitaciones-de-expo-en-la-web)
8. [Fiabilidad de la IA y errores](#8-fiabilidad-de-la-ia-y-errores)
9. [Seguridad, costes y abuso](#9-seguridad-costes-y-abuso)
10. [Privacidad y aspectos legales](#10-privacidad-y-aspectos-legales)
11. [Pruebas con usuarios reales](#11-pruebas-con-usuarios-reales)
12. [Reglas del hackathon: puntos a confirmar](#12-reglas-del-hackathon-puntos-a-confirmar)
13. [Riesgos del proyecto y plan B](#13-riesgos-del-proyecto-y-plan-b)
14. [Prioridades si falta tiempo](#14-prioridades-si-falta-tiempo)

---

## 1. Principio rector: diseñado para mayores

La versión anterior pensaba como alguien que se maneja bien con el celular. A partir de ahora, **cada decisión se valida con una pregunta**:

> *¿Mi abuela podría usar esto sola, sin gafas de cerca y sin nadie al lado?*

Si la respuesta es no, se simplifica.

Reglas que se derivan:

- **Una pantalla, una idea.**
- **Una respuesta, no un informe.**
- **Nada que haya que saber hacer antes** (copiar, pegar, hacer capturas, abrir menús).
- **La app habla**, no solo muestra.
- **Siempre hay un humano a un toque**: el familiar de confianza.

---

## 2. Cambios en la experiencia de usuario

### 2.1 Eliminar el copiar y pegar como vía principal

Copiar un SMS es una de las tareas que más cuesta a las personas mayores. Pasa a ser una opción secundaria. Las vías principales son:

| Botón | Qué hace | Para quién |
|---|---|---|
| 📷 **Tómale una foto** | Abre la cámara para fotografiar la pantalla del celular, una carta o un papel | Quien no sabe hacer capturas, o recibe el mensaje en otro dispositivo |
| 🎤 **Léemelo** | La persona lee el mensaje en voz alta y la app lo transcribe | Quien no sabe usar la cámara o tiene poca visión |
| 🖼️ **Elige una captura** | Abre la galería | Quien sí sabe hacer capturas |
| ⌨️ *Pegar texto* (pequeño, abajo) | Campo de texto clásico | Familiares, jóvenes, el jurado |

### 2.2 Una respuesta en una frase

El resultado deja de ser un panel con puntuación, tipo de estafa y lista de señales. Ahora es **una frase enorme** y **una razón corta**:

| Veredicto | Titular | Razón, en la voz de Sonny (ejemplo) |
|---|---|---|
| 🛑 Estafa | **NO lo abras. Es una estafa.** | Se hacen pasar por tu banco para quitarte dinero. |
| ⚠️ Dudoso | **Espera. Esto no me convence.** | Mejor no hagas nada y lo preguntamos. |
| ✅ Normal | **Esto parece normal.** | Pero ya sabes: tus claves, nunca a nadie. |

- **Se elimina la puntuación numérica** de la pantalla principal (confunde y transmite falsa precisión).
- **Se elimina el "tipo de estafa"** como etiqueta técnica; se integra en la razón.
- Los detalles (señales, fragmentos resaltados) quedan detrás de un botón **"¿Por qué?"**.

### 2.3 🔁 La voz, como complemento

> **Cambiado** (`Sonny_Modelo_y_Arquitectura.md`, sección 10): la prioridad es el **texto en pantalla**. La voz está **desactivada por defecto** y se activa en Ajustes.

- Con la voz activada, el resultado muestra un botón grande **🔊 Escuchar**; **no se reproduce sola**.
- Voz del propio dispositivo (`expo-speech`), **pausada** (velocidad reducida) y en el idioma del usuario.
- Como siempre hay un toque previo (el botón Escuchar), el navegador no la bloquea.

### 2.4 Llamar a alguien de confianza

Sustituye al botón genérico "Compartir".

- **Primera vez:** la app pide *"¿A quién llamas cuando tienes una duda?"* y se guarda nombre y teléfono **solo en el dispositivo**.
- **En el resultado:** botón grande **📞 Llamar a [Laura]**.
- Segundo botón más pequeño: **💬 Enviarle el mensaje a [Laura]** (WhatsApp con el mensaje sospechoso y el veredicto).
- Si no hay contacto guardado, se muestra **📞 Llamar a mi banco** con instrucciones para usar el número de la tarjeta.

### 2.5 Qué hacer, en pasos de uno en uno

Pasos grandes y numerados, **máximo tres**:

1. **No toques el enlace.**
2. **Borra el mensaje.**
3. **¿Ya diste tus datos?** → botón *"Sí, ¿qué hago?"* que abre pasos de emergencia (llamar al banco, bloquear la tarjeta, avisar a un familiar).

### 2.6 Ejemplos de prueba

Se mantienen los tres ejemplos (estafa, dudoso, normal), pero **en una sección aparte** para el jurado y para demostraciones, no en la pantalla principal de la persona mayor.

---

## 3. Lenguaje y tono

### 3.0 Sonny habla como un nieto

Todo el texto de la app, y la voz, salen **de Sonny en primera persona**, no de "la aplicación":

| En vez de… | Sonny dice… |
|---|---|
| "Analizando mensaje…" | "Déjame revisarlo… un momento." |
| "Resultado del análisis" | *(sin título; directamente el veredicto)* |
| "Se recomienda no interactuar" | "No lo abras, ¿sí?" |
| "Error de conexión" | "Ahora mismo no puedo revisarlo. Mientras tanto, no toques nada." |
| "Configurar contacto de emergencia" | "¿A quién llamas tú cuando tienes una duda?" |
| *(nada al terminar)* | "Hiciste muy bien en preguntarme. Para eso estoy." |

Rasgos que nunca se rompen: **fiel** (siempre disponible), **paciente** (repite sin quejarse), **cariñoso**, **protector** (ante la duda, esperar) y **sin juzgar**.

> Sonny ayuda, pero **no sustituye a la familia**: su papel es frenar la estafa en el momento y acercar a la persona a alguien de confianza (botón "Llamar a…"). Este mensaje refuerza el impacto ante el jurado.

### 3.1 Reglas de redacción

- Frases de **menos de 12 palabras**.
- 🔁 **Trato decidido:** **tú** por defecto (cercano, como un nieto), cambiable a **usted** en Ajustes. Mantenerlo igual en toda la app. Español **neutro latinoamericano** ("celular", "tocar", sin "vosotros" ni servicios de un solo país).
- **Sin tecnicismos.** Nunca: enlace malicioso, phishing, credenciales, URL, dominio, typosquatting.
- **Sin culpa.** Nunca "caíste" o "deberías haberte dado cuenta". Siempre: *"Estas estafas engañan a mucha gente. Hiciste bien en revisarlo."*
- **Tranquilizar** antes de instruir, sobre todo en el caso de "ya di mis datos".

### 3.2 Diccionario de traducción

| Término técnico | Cómo decirlo |
|---|---|
| Enlace sospechoso / typosquatting | "Este enlace parece del banco, pero es falso." |
| Solicitud de credenciales | "Te piden tu clave. El banco nunca lo hace." |
| Táctica de urgencia | "Te meten prisa para que no pienses." |
| Suplantación de identidad | "Se hacen pasar por [una empresa de envíos / tu banco / tu hijo]." |
| Petición de pago | "Te piden dinero. Es la trampa." |
| Premio / oferta irreal | "Nadie regala dinero así." |
| Riesgo 92/100 | *(no se muestra)* |

### 3.3 Mensaje de cierre siempre presente

> *"Si tienes dudas, no hagas nada y llama a alguien de confianza. Esperar nunca es peligroso. Y aquí estoy yo para lo que necesites."*

---

## 4. Diseño visual y accesibilidad

### 4.1 Modo mayores por defecto

El antiguo "Modo fácil" pasa a ser **el modo por defecto**. Existe un "Modo detallado" opcional para familiares y jóvenes.

### 4.2 Medidas concretas

| Elemento | Valor mínimo |
|---|---|
| Texto normal | 20 px |
| Titular del resultado | 36–44 px, negrita |
| Botones | 64 px de alto, ancho completo |
| Separación entre botones | 16 px |
| Botones por pantalla | Máximo 3 principales |
| Contraste de texto | WCAG AA (4,5:1), mejor AAA (7:1) |

### 4.3 Otras reglas

- Cada botón lleva **icono y texto**, nunca solo icono.
- **No depender solo del color**: rojo/amarillo/verde siempre acompañados de icono (🛑 ⚠️ ✅) y palabra.
- **Sin animaciones** rápidas, carruseles, menús desplegables ni gestos (deslizar, mantener presionado).
- **Sin tiempos límite** ni mensajes que desaparecen solos (*toasts*).
- **Botón "Atrás" siempre visible** y grande, con texto "Volver".
- Respetar el **tamaño de letra del sistema** del usuario.
- Etiquetas de accesibilidad (`accessibilityLabel`) en todos los botones para lectores de pantalla.
- Mientras analiza: mensaje tranquilo y fijo, *"Déjame revisarlo… un momento"*, en lugar de varias frases que cambian.
- **Identidad visual de Sonny:** un avatar sencillo y amable (por ejemplo, un joven sonriente ilustrado de forma simple) que aparece junto a sus respuestas, para reforzar que "habla un nieto". Colores cálidos y tranquilos; evitar tipografías o colores que recuerden a marcas conocidas.

---

## 5. Nuevo flujo y pantallas

### 5.1 Flujo

```
[Primera vez]
  ¿A quién llamas cuando tienes una duda?  →  guarda contacto (local)

[Inicio]
  ¿Has recibido un mensaje raro?
  [ 📷 Tómale una foto  ]
  [ 🎤 Léemelo          ]
  [ 🖼️ Elige una captura ]
        pegar texto · ejemplos (pequeño)
             │
             ▼
[Revisando…]  "Déjame revisarlo… un momento"
             │
             ▼
[Resultado]   🛑 NO lo abras. Es una estafa.        ← texto grande
              Alguien se hace pasar por tu banco.
              [ 📞 Llamar a Laura     ]
              [ 🔊 Escuchar (si voz) ]
              [ ¿Qué hago ahora?      ]
                 ¿Por qué? (pequeño)
             │
             ├──► [Qué hago ahora]  1·2·3  +  "¿Ya diste tus datos?"
             └──► [¿Por qué?]       mensaje con señales resaltadas
```

### 5.2 Pantallas actualizadas

| Pantalla | Cambio respecto a la documentación principal |
|---|---|
| **Bienvenida / contacto** | Nueva. Solo se muestra la primera vez. Se puede saltar. |
| **Inicio** | Tres botones grandes. Pegar texto y ejemplos pasan a segundo plano. |
| **Revisando** | Un único mensaje fijo y tranquilo. |
| **Resultado** | Solo titular, razón y tres botones. Botón "Escuchar" si la voz está activada. |
| **Qué hago ahora** | Nueva. Pasos de uno en uno + ruta de emergencia. |
| **¿Por qué?** | Contiene lo que antes estaba en el resultado: señales resaltadas. |
| **Ajustes** | Idioma (English / Español), trato (tú / usted), voz (desactivada por defecto), contacto de confianza, modo detallado. |

---

## 6. Cambios técnicos derivados

### 6.1 🔁 Nuevo contrato de la API

> **Sustituido** por `Sonny_Modelo_y_Arquitectura.md` 9.3: `verdict`, `extractedText`, `headline` (≤ 8 palabras), `reason` (≤ 20), `steps` y `emergencySteps` (≤ 3 cada uno). La IA **no** recibe la puntuación del modelo. Se mantiene abajo como referencia para la pantalla "¿Por qué?" (`signals`).

Se añaden campos pensados para mayores. Los campos anteriores se mantienen para la pantalla "¿Por qué?".

```json
{
  "verdict": "scam",
  "headline": "NO lo abras. Es una estafa.",
  "simpleReason": "Alguien se hace pasar por una empresa de envíos para robarte dinero.",
  "steps": [
    "No toques el enlace.",
    "Borra el mensaje.",
    "Si esperas un paquete, revisa en la web oficial."
  ],
  "emergencySteps": [
    "Llama a tu banco al número que está detrás de tu tarjeta.",
    "Pide que bloqueen la tarjeta.",
    "Cuéntaselo a alguien de confianza."
  ],
  "signals": [
    {
      "type": "suspicious_link",
      "quote": "entregas-envio.info/pago",
      "explanation": "Parece la web de la empresa de envíos, pero es falsa."
    }
  ],
  "extractedText": "Su paquete está retenido...",
  "riskScore": 92
}
```

- `headline`: máximo 8 palabras.
- `simpleReason`: máximo 15 palabras.
- `steps`: máximo 3, cada uno de menos de 10 palabras.
- `riskScore`: se calcula y se usa internamente, **pero no se muestra** en el modo por defecto.

### 6.2 🔁 Cambios en el prompt del sistema

> **Prompt vigente:** `Sonny_Modelo_y_Arquitectura.md` 9.4 (incluye idioma de respuesta y tú/usted). Las ideas de abajo ya están incluidas en él.

Añadir al prompt:

> Eres Sonny, un nieto cariñoso y fiel. Habla en primera persona, con calidez y sin juzgar. Tu respuesta la leerá una persona mayor sin conocimientos técnicos. Usa frases muy cortas. No uses nunca estas palabras: enlace malicioso, phishing, credenciales, URL, dominio. Di "enlace falso", "tu clave", "la web". No culpes al usuario. Si dudas entre "dudoso" y "seguro", elige "dudoso".

### 6.3 Validación de la respuesta

- Validar el JSON de la IA en el servidor (por ejemplo con `zod`).
- Si falta un campo o está mal formado, **reintentar una vez**; si vuelve a fallar, devolver un resultado prudente por defecto (ver [8.3](#83-qué-mostrar-cuando-algo-falla)).
- Recortar textos que superen los límites de longitud.

### 6.4 Nuevas dependencias

| Paquete | Uso |
|---|---|
| `expo-camera` o `expo-image-picker` (con `launchCameraAsync`) | Botón "Tómale una foto" |
| Web Speech API (`SpeechRecognition`) en web / `expo-speech-recognition` en celular | Botón "Léemelo" |
| `expo-speech` | Botón "Escuchar" (voz opcional) |
| `@react-native-async-storage/async-storage` | Guardar contacto de confianza y ajustes |
| `expo-linking` | `tel:` para llamar y `https://wa.me/` para WhatsApp |
| `zod` | Validar la respuesta de la IA |

### 6.5 Compresión de imágenes

Las fotos de cámara pueden pesar varios MB. Antes de enviarlas:

- Redimensionar a un máximo de ~1600 px de lado (`expo-image-manipulator`).
- Comprimir a JPEG calidad ~0,7.
- Así se reduce el tiempo de espera (importante para mayores) y el coste de la API.

---

## 7. Limitaciones de Expo en la web

Como la versión principal es **web**, hay funciones que se comportan distinto que en la app nativa:

| Función | Comportamiento en web | Qué hacer |
|---|---|---|
| **Cámara** | En el celular, el selector de imágenes del navegador suele ofrecer "Tomar foto". En computadora, solo abre archivos. | Probar en el celular. Para la demo, grabar desde el celular. |
| **Reconocimiento de voz** | Depende del navegador: funciona en Chrome y Edge; en Safari es parcial y en Firefox no está disponible. | Detectar si existe; si no, **ocultar el botón "Léemelo"** en vez de mostrar un error. |
| **Voz (texto a voz)** | Funciona en la mayoría de navegadores, pero puede requerir un toque previo del usuario. | Asegurar que siempre hay un toque antes de hablar. |
| **Llamar (`tel:`)** | Funciona en el navegador del celular; en computadora no hace nada útil. | En computadora, mostrar el número en grande en lugar del botón de llamada. |
| **Portapapeles** | El navegador pide permiso para leerlo. | Mantener como opción secundaria. |
| **API routes** | Necesitan `"web": { "output": "server" }` y un hosting con servidor (EAS Hosting). Un hosting solo estático no las ejecuta. | Desplegar en EAS Hosting desde el principio y comprobarlo en la hora 0–2. |

> 📱 **Recomendación:** grabar la demo del video desde un **celular Android con Chrome**, que es donde mejor funcionan cámara, voz y llamadas.

---

## 8. Fiabilidad de la IA y errores

### 8.1 Falsos negativos (el riesgo más grave)

Decirle "parece normal" a una estafa es **mucho peor** que lo contrario. Medidas:

- **Nunca** decir "es seguro" ni "100 %". El veredicto verde es *"Parece normal"* y siempre va con *"Aun así, nunca des tus claves a nadie."*
- Ante la duda, la IA debe elegir **dudoso** (incluido en el prompt).
- Las **reglas locales de enlaces** actúan como red de seguridad: si detectan algo grave, el resultado **no puede ser verde**, diga lo que diga la IA.
- **Modelo propio en zona alta:** si el modelo da una puntuación alta (`p ≥ T_MID`), la IA no puede bajar el resultado a verde (`Sonny_Modelo_y_Arquitectura.md` 8.3).
- ~~Regla extra: si el mensaje pide **dinero, claves o códigos**, como mínimo será **dudoso**.~~ 🔁 **Eliminada**: marcaba como dudosos los códigos legítimos de los bancos. Lo deciden el modelo y la IA.

### 8.2 Falsos positivos

Marcar como estafa un mensaje real del banco puede asustar o hacer que la persona ignore un aviso legítimo. Por eso el paso recomendado nunca es "ignóralo", sino **"comprueba llamando al número oficial"**, que es correcto en ambos casos.

### 8.3 Qué mostrar cuando algo falla

| Situación | Mensaje |
|---|---|
| 🔁 Sin internet | Veredicto del **modelo propio** (filtro 1) con el aviso *"Sin conexión: revisión básica."* + botón de llamar. Solo las **fotos** necesitan internet: *"Sin conexión no puedo leer fotos. ¿Me escribes o pegas el mensaje?"* |
| 🔁 La IA tarda más de 15 s | Se usa el veredicto del modelo propio, como sin internet (`Sonny_Modelo_y_Arquitectura.md` 8.3) |
| 🔁 La IA falla | Se usa el veredicto del modelo propio + reglas, como sin internet |
| La foto no se lee | *"No puedo leer bien la foto. Intenta acercarte más o a leérmelo en voz alta."* |
| Mensaje vacío o sin sentido | *"No he encontrado ningún mensaje. ¿Lo intentamos otra vez?"* |

**Nunca** mostrar mensajes de error técnicos (códigos, "Error 500", trazas).

### 8.4 🔁 Modo sin conexión (ya no es opcional)

**Sustituido:** en lugar de una lista de palabras clave, el dispositivo ejecuta **los modelos propios Sonny-EN y Sonny-ES** + las reglas de enlaces (`Sonny_Modelo_y_Arquitectura.md` 8.2, código en `modelo/`). En la APK funciona sin internet desde el primer uso.

> ⚠️ Limitación medida (`modelo/reports/bateria.md`): sin internet, el "hijo/familiar en apuros" puede salir como "parece normal". Recopilar mensajes reales de este tipo es prioritario.

---

## 9. Seguridad, costes y abuso

- **Clave de API** solo en el servidor, en variables de entorno. Nunca en el repositorio ni en el cliente. Revisar el historial de Git antes de hacer público el repositorio.
- **Límite de peticiones** por IP en la API route (por ejemplo, 20 por hora) para que nadie agote el crédito durante la evaluación.
- **Tamaño máximo** de imagen y de texto aceptado por el servidor.
- **Límite de gasto** configurado en el panel del proveedor de IA.
- **Mantener la app desplegada y funcionando** durante todo el periodo de evaluación (8–15 de noviembre de 2026). Comprobar que el crédito de la API alcanza.
- No ejecutar ni visitar nunca los enlaces analizados desde el servidor: solo se **analiza el texto** de la URL.

---

## 10. Privacidad y aspectos legales

- **No guardar** mensajes, fotos ni transcripciones en el servidor. Procesar y descartar.
- El **contacto de confianza** se guarda solo en el dispositivo.
- Revisar que el proveedor de IA elegido **no use los datos para entrenar** (o indicarlo en la política).
- En la pantalla de foto: *"Si en la foto salen datos personales, puedes taparlos con el dedo."*
- **Aviso visible y sencillo:** *"Sonny te ayuda, pero puede equivocarse. Ante la duda, llama siempre al número oficial."*
- No usar **logotipos de bancos o empresas reales** en la app ni en el video; en los ejemplos, usar marcas inventadas o texto sin logos.
- **Nombre "Sonny":** se parece a la marca "Sony". Para un hackathon no debería ser un problema, pero no usar tipografías, colores ni un logo que recuerden al de Sony. Si el proyecto continúa después del hackathon, revisar el registro de marca antes de publicarlo en tiendas.
- No presentar la app como servicio oficial ni afiliado a ningún banco, policía u organismo.

---

## 11. Pruebas con usuarios reales

Es lo que más puede diferenciar el proyecto frente al jurado.

### 11.1 Prueba rápida (30 minutos)

- Probar con **2 o 3 personas mayores** (abuelos, vecinos, familiares).
- Darles un celular con un SMS de estafa de ejemplo y decir solo: *"Comprueba si este mensaje es de fiar."*
- **No ayudar.** Observar dónde se atascan.
- Anotar: ¿encontraron el botón? ¿entendieron el resultado? ¿sabrían qué hacer?

### 11.2 Qué aprovechar

- Corregir lo que falle antes de grabar.
- **Pedir permiso** para grabar a una de esas personas usando la app. Un clip de 10–15 segundos de una persona mayor real usándola vale más que cualquier explicación.
- Incluir en Devpost una frase del tipo: *"Lo probamos con X personas mayores y cambiamos Y."*

### 11.3 Batería de mensajes de prueba

Preparar al menos 10 mensajes para comprobar que la app acierta:

| Tipo | Ejemplo |
|---|---|
| Falso paquete | Paquete retenido, pague 1,99 |
| Falso banco | Su cuenta ha sido bloqueada, verifique aquí |
| "Hijo en apuros" | Hola mamá, se me rompió el celular, este es mi número nuevo |
| Falso premio | Ha ganado un iPhone, reclámelo aquí |
| Falsa multa / impuestos | Tiene una multa pendiente, pague antes de 24 h |
| Falsa oferta de trabajo | Gane 300 dólares al día desde casa |
| Inversión | Duplique su dinero con criptomonedas |
| **Legítimo:** código de verificación | Tu código es 482913. No lo compartas. |
| **Legítimo:** cita médica | Recordatorio de su cita el día 12 a las 10:00 |
| **Legítimo:** mensaje familiar | ¿Vienes a comer el domingo? |

---

## 12. Reglas del hackathon: puntos a confirmar

Las reglas que tenemos por escrito **no coinciden** con las que publica Devpost:

| Aspecto | Reglas recibidas | Página de Devpost |
|---|---|---|
| Video | 2–5 minutos | 1–3 minutos |
| Evaluación | 4 criterios al 25 % | Solo "Impacto" |
| Edad | 13+ | Mayoría de edad del país de residencia |
| Participantes | Abierto a todos | Solo estudiantes, sin empresas |

**Qué hacer:**

- Hacer el **video de 2–3 minutos**: cumple ambas versiones.
- Cubrir **los cuatro criterios**, pero **poner el impacto en primer plano**.
- **Comprobar la elegibilidad** de cada miembro del equipo (edad y condición de estudiante).
- Si hay dudas, escribir al organizador desde el enlace de contacto de Devpost.

### Otros puntos del envío

- La página de Devpost y el video, **en inglés** (el hackathon es internacional). 🔁 La app arranca en **inglés** por defecto, con **español** como opción en la primera pantalla y en Ajustes.
- Si el video está en español, **añadir subtítulos en inglés**.
- El repositorio debe ser **público** y tener **instrucciones de instalación** en el `README.md`.
- Proyecto **creado durante el periodo** del hackathon: hacer commits frecuentes como prueba.
- Si se usa IA para generar código, que sea conforme a los términos de la herramienta y que el equipo entienda y pueda explicar lo construido.
- **Añadir a todos los miembros** del equipo en Devpost antes del cierre.

---

## 13. Riesgos del proyecto y plan B

| Riesgo | Probabilidad | Plan B |
|---|---|---|
| Las API routes no funcionan en el despliegue | Media | Mover el endpoint a una función de Vercel y exportar la web como estática |
| El reconocimiento de voz falla en el navegador | Alta | Ocultar el botón "Léemelo"; mencionarlo como función de la versión para celular |
| La cámara no abre en web | Media | Usar el selector de imágenes, que en el celular ofrece "Tomar foto" |
| Se agota el crédito de la API durante la evaluación | Baja | Límite por IP + límite de gasto + recargar crédito |
| No da tiempo a terminar | Media | Seguir el orden de la [sección 14](#14-prioridades-si-falta-tiempo) |
| La IA da respuestas largas o técnicas | Media | Validación con `zod` + recorte de textos + prompt estricto |
| No se llega a tiempo de subir a Devpost | Baja | Crear el borrador en Devpost **desde el principio** y rellenarlo durante el día |

---

## 14. Prioridades si falta tiempo

Construir en este orden. Cada nivel debe funcionar antes de pasar al siguiente.

| Nivel | Incluye | Si solo llegamos aquí… |
|---|---|---|
| **1. Imprescindible** | Pegar texto → **modelo propio** (ya entrenado en `modelo/`) + IA → titular + razón + pasos. Desplegado en web. | Ya se puede presentar |
| **2. Lo que lo hace para mayores** | Diseño grande, texto primero, botón "Escuchar" (voz opcional), lenguaje sencillo | Proyecto sólido y coherente con la idea |
| **3. Lo que lo hace destacar** | Foto/captura, reglas de enlaces, contacto de confianza y llamada, APK sin internet | Proyecto competitivo |
| **4. Extras** | "Léemelo", "¿Por qué?" con señales resaltadas, emergencia | Proyecto completo |
| **5. Si sobra tiempo** | Historial, mini-curso | Pulido final |

> Regla de oro: **reservar al menos 3 horas al final para video y Devpost**, aunque falten funciones. Un proyecto bien presentado con el nivel 2 puntúa más que uno con el nivel 4 sin buen video.

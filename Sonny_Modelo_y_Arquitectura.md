# Sonny — Modelos propios, arquitectura y empaquetado

> *"El nieto que nunca te deja solo ante una estafa."*
>
> Indicaciones técnicas para construir los **dos modelos propios** (inglés y español), la **cascada de dos filtros** (modelo en el dispositivo + IA como segunda opinión) y el **empaquetado en web y APK**.
>
> **Orden de prioridad de los documentos:** este documento > `consideraciones.md` > `Sonny_Documentacion.md`. La sección 14 lista qué cambia respecto a los otros dos.
>
> **Código:** todo lo de las secciones 3 a 7 está implementado y probado en [`modelo/`](modelo/README.md). Métricas actuales en [`modelo/reports/metrics.md`](modelo/reports/metrics.md).

---

## Índice

0. [Decisiones tomadas](#0-decisiones-tomadas)
1. [Visión general](#1-visión-general)
2. [Idiomas](#2-idiomas)
3. [Datasets](#3-datasets)
4. [Preprocesado del texto (idéntico en Python y JavaScript)](#4-preprocesado-del-texto-idéntico-en-python-y-javascript)
5. [Entrenamiento de los modelos](#5-entrenamiento-de-los-modelos)
6. [Detector de idioma](#6-detector-de-idioma)
7. [Exportación a JSON y ejecución en la app](#7-exportación-a-json-y-ejecución-en-la-app)
8. [La cascada de dos filtros](#8-la-cascada-de-dos-filtros)
9. [IA externa: segunda opinión, sin proveedor fijo](#9-ia-externa-segunda-opinión-sin-proveedor-fijo)
10. [Ajustes del usuario](#10-ajustes-del-usuario)
11. [Empaquetado: web y APK](#11-empaquetado-web-y-apk)
12. [Estructura del repositorio](#12-estructura-del-repositorio)
13. [Métricas, licencias y lo que se cuenta en Devpost](#13-métricas-licencias-y-lo-que-se-cuenta-en-devpost)
14. [Cambios respecto a los documentos anteriores](#14-cambios-respecto-a-los-documentos-anteriores)
15. [Orden de trabajo](#15-orden-de-trabajo)
16. [Riesgos conocidos y puntos abiertos](#16-riesgos-conocidos-y-puntos-abiertos)

---

## 0. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Público | Hispanohablantes de varios países y angloparlantes. Origen del equipo: Bolivia. |
| Idioma por defecto | **Inglés** (hackathon internacional). Español como opción. |
| Modelos | **Dos modelos propios**: uno entrenado solo con datos en inglés y otro solo con datos en español. |
| Datos | **Datasets reales, sin traducir.** Inglés con inglés, español con español. Única excepción: `softecapps/spam_ham_spanish` (SMS cortos en español, posiblemente plantillas), usado con 10 etiquetas corregidas y documentado (sección 3.3). |
| Filtros | **Filtro 1:** modelo propio + reglas de enlaces (siempre, en el dispositivo). **Filtro 2:** IA externa como segunda opinión (solo con internet y según la puntuación). |
| Sin internet | Solo el filtro 1, en modo prudente. |
| Proveedor de IA | **Gemini** (`gemini-3.8-flash`, con visión para fotos). El código permite cambiar de proveedor con `AI_PROVIDER`. |
| Resultado | **Prioridad al texto en pantalla:** veredicto, razón y recomendaciones. |
| Voz | Voz mecánica del dispositivo, **desactivada por defecto**, activable en Ajustes. |
| Trato en español | **Tú** por defecto (cercano, como un nieto), cambiable a **usted** en Ajustes. |
| Entregables | **Web** (la que prueba el jurado) **+ APK** de Android (funciona sin internet con el modelo). |
| Equipo | Domina Python, JavaScript/TypeScript y ya usó Expo / React Native. |

---

## 1. Visión general

```
                         ┌──────────────────────────────────────┐
 Mensaje (texto o foto)  │          EN EL DISPOSITIVO           │
 ───────────────────────►│                                      │
                         │  Detector de idioma (modelo propio)  │
                         │        │                             │
                         │        ├── EN ──► Modelo Sonny-EN ─┐ │
                         │        └── ES ──► Modelo Sonny-ES ─┤ │
                         │                                    ▼ │
                         │  Reglas de enlaces ──────► FILTRO 1  │
                         │                       (puntuación p) │
                         └──────────────────┬───────────────────┘
                                            │
                  ┌─────────────────────────┼──────────────────────────┐
                  │ Sin internet            │ Con internet             │
                  ▼                         ▼                          │
         Veredicto prudente       ¿p muy alta? ── sí ──► Estafa        │
         del filtro 1                  │                (sin enviar    │
                                       no                el mensaje)   │
                                       ▼                               │
                               FILTRO 2: IA externa                    │
                               (segunda opinión independiente)         │
                                       │                               │
                                       ▼                               │
                               Tabla de decisión (sección 8) ──► Veredicto final
```

> **Nota sobre las fotos:** primero se le pide a la IA que lea la foto, porque lee mejor. Si la IA no está disponible (sin internet, sin clave o con un error), el texto se lee **en el propio dispositivo**: con `tesseract.js` (inglés y español) en la web y con ML Kit (`expo-text-extractor`) en la APK. En la APK el modelo de ML Kit va incluido (`app/plugins/with-bundled-text-recognition.js`, unos 4 MB), así que funciona sin internet desde el primer uso. En los dos casos la foto no sale del dispositivo, y el texto leído pasa por la cascada igual que un mensaje escrito. Los archivos del OCR web están en `app/public/ocr/` (`npm run sync-ocr`). En Expo Go no hay OCR local, porque es un módulo nativo; ahí las fotos siguen necesitando la IA.

---

## 2. Idiomas

### 2.1 Primera vez que se abre la app

- Pantalla de selección de idioma con **English preseleccionado** y **Español** como segunda opción.
- El idioma elegido define:
  1. El idioma de la interfaz.
  2. El idioma en el que Sonny responde y recomienda.
  3. El **modelo principal** de ese usuario.
- Se puede cambiar después en Ajustes.

### 2.2 Cada mensaje

| Caso | Modelo usado | Idioma de la respuesta |
|---|---|---|
| El detector dice "idioma del usuario" con seguridad | Principal | Idioma del usuario |
| El detector dice "el otro idioma" con seguridad | Secundario | Idioma del usuario, avisando: *"Este mensaje está en inglés. Dice que…"* |
| El detector duda (mensaje corto o mezclado) | Principal | Idioma del usuario |

El modelo secundario **se carga solo cuando hace falta**, no al abrir la app.

### 2.3 Variante del español

Español **neutro latinoamericano**, entendible en Bolivia y en el resto de países:

- "celular" en lugar de "móvil"; "transferencia" en lugar de nombres de servicios de un solo país.
- Sin "vosotros".
- Ejemplos de estafas genéricos (banco, paquete, premio, familiar en apuros, trabajo, inversión), sin nombres de empresas de un único país.

### 2.4 Tono en inglés

En inglés no hay tú/usted. Sonny habla de forma cercana y respetuosa: *"Don't open it, okay? This is a scam."*

---

## 3. Datasets

### 3.1 Política de datos

1. **Mensajes reales.** Nada traducido. Excepción documentada: `softecapps` (ver 3.3).
2. **Cada modelo solo con su idioma.** El inglés con datos en inglés; el español con datos en español.
3. **Licencia comprobada** de cada fuente; si no tiene licencia clara, no se usa.
4. **Mensajes reales recopilados a mano** (alertas oficiales, celulares propios) **sí cuentan como datos reales**, siempre anonimizados. Van en `modelo/data/manual/` (sección 3.4).

> **Etiqueta:** `label = 1` significa **estafa o spam**. La SMS Spam Collection y softecapps no distinguen publicidad de estafa, así que el modelo aprende "mensaje no deseado y sospechoso". El subtipo original (`ham`, `spam`, `smishing`, `phishing`) se guarda en la columna `subtype` para medir por separado.

### 3.2 Fuentes en inglés

| Dataset | Contenido | Licencia | Uso |
|---|---|---|---|
| **SMS Spam Collection** (UCI) | 5.574 SMS *ham* / *spam* | CC BY 4.0 | ✅ Base principal |
| **SMS Phishing Dataset** (Mishra y Soni, Mendeley Data `f45bkkt8pr`) | 5.971 SMS *ham* / *spam* / *smishing* | CC BY 4.0 | ✅ Aporta **638 SMS de smishing** reales |
| **ealvaradob/phishing-dataset** (Hugging Face) | SMS, correos, URLs y webs | Apache-2.0 | ❌ `texts.json` mezcla SMS y correos **sin columna de origen**. Su parte de SMS es el dataset de Mishra y Soni, que usamos directamente |
| **SpamShield Datasets** (Hugging Face) | Multilingüe | CC BY 4.0 | ❌ Acceso restringido y **35–40 % sintético** según su ficha, sin forma de filtrarlo |
| **Smishtank** | 1.062 SMS de *smishing* | **No indica licencia** | ❌ No se usa |

Tras unir y eliminar duplicados (la mayoría de los "ham" de Mishra y Soni ya están en la UCI): **5.981 mensajes, 944 estafa/spam**.

### 3.3 Fuentes en español

| Fuente | Contenido | Licencia | Uso |
|---|---|---|---|
| **SpaPhish** v5 (Mendeley Data `hz2d6gz7pc`) | 1.395 correos en español nativo (731 fraude, 664 legítimos) | CC BY 4.0 | ✅ Asunto + 500 primeros caracteres del cuerpo |
| **softecapps/spam_ham_spanish** (Hugging Face) | 1.207 SMS cortos (*spam* / *ham*) | Apache-2.0 | ✅ Con **10 etiquetas corregidas** (ver nota) |
| **Mensajes reales recopilados** | SMS y WhatsApp de estafas y mensajes legítimos | Propios | ✅ Imprescindibles (ver 3.4). **Aún vacío** |

Tras unir y eliminar duplicados: **2.384 mensajes, 1.223 estafa/spam**.

**Nota sobre softecapps:** son frases plantilla, probablemente generadas, con 148 duplicados y etiquetas incoherentes. Es una excepción a la política 3.1 que se acepta porque son **los únicos SMS cortos en español con licencia abierta**. Se corrigieron solo los errores evidentes: 9 estafas marcadas como *ham* (por ejemplo, *"Estoy en problemas por favor enviame dinero"* o *"Reclama aquí tu premio por tu compra"*) y 1 recordatorio normal marcado como *spam*. Están en `modelo/data/manual/relabel_es.csv`, con su motivo, y la columna `relabeled` marca cada fila corregida. Su "spam" incluye mucha publicidad.

> ⚠️ **Limitación importante:** no hay datasets públicos de **SMS reales de estafa en español**. SpaPhish son **correos** y softecapps son plantillas. En la batería de prueba (`modelo/reports/bateria.md`) el modelo falla en el **"familiar en apuros"**, también en inglés. Por eso la sección 3.4 no es opcional.

### 3.4 Recopilar mensajes reales en español

- **Fuentes:** alertas publicadas por bancos, reguladores financieros, policía y organismos de defensa del consumidor de Bolivia y otros países hispanohablantes, que suelen reproducir el texto real de las estafas; y SMS/WhatsApp recibidos por el equipo, la familia y amigos (con permiso).
- **Incluir también mensajes legítimos:** códigos de verificación de bancos, recordatorios de citas, avisos de entrega reales, mensajes familiares. Sin ellos, el modelo marcará todo como estafa.
- **Anonimizar siempre:** sustituir nombres, números de teléfono, números de cuenta y direcciones antes de guardarlos.
- **Objetivo mínimo:** 150 estafas + 150 legítimos. Mejor 300 + 300.
- **Dónde:** `modelo/data/manual/es_manual.csv` (y `en_manual.csv`), con las columnas `text, label, channel, source_detail`. Instrucciones en `modelo/data/manual/README.md`.

### 3.5 Formato unificado

Todo se une en un CSV por idioma: `modelo/data/processed/en.csv` y `modelo/data/processed/es.csv` (lo genera `02_prepare.py`).

| Columna | Ejemplo | Descripción |
|---|---|---|
| `text` | "Your package is on hold…" | Texto original sin preprocesar |
| `label` | `1` | 1 = estafa/spam, 0 = legítimo |
| `lang` | `en` | `en` o `es` |
| `source` | `uci_sms` | `uci_sms`, `mendeley_sms`, `spaphish`, `softecapps`, `manual` |
| `channel` | `sms` | `sms`, `email`, `whatsapp` |
| `subtype` | `smishing` | Etiqueta original más fina |
| `relabeled` | `0` | 1 si la etiqueta se corrigió a mano |
| `split` | `dev` | `dev` (85 %) o `test` (15 %) |

**Limpieza:**
- Sustituir el carácter `U+FFFD` (restos de errores de codificación en las fuentes), eliminar filas vacías y **duplicados** (tras preprocesar), **antes** de dividir, para que no haya mensajes repetidos en ambos lados.
- Si el mismo texto aparece con etiquetas distintas, se queda la de estafa (más prudente).
- **Correos (SpaPhish):** usar `asunto + " " + primeros 500 caracteres del cuerpo`, para acercarlos a la longitud de un mensaje.

### 3.6 División

- **85 % `dev` y 15 % `test`**, estratificada por `label` + `source` (así cada fuente está representada en la prueba).
- Semilla fija (`random_state=42`) para que los resultados se puedan reproducir.
- Sobre `dev` se usa **validación cruzada de 5 particiones** para elegir `C` y los umbrales (sección 5). La **prueba** solo se mira una vez, al final, para las cifras de Devpost.

> **Por qué no un conjunto de validación fijo:** el documento original elegía los umbrales con un modelo entrenado sin la validación y después reentrenaba con ella. Así los umbrales quedaban calibrados para **otro modelo**. Con predicciones *out-of-fold* los umbrales salen de mensajes que el modelo no vio y con la misma receta del modelo final. Además, se aprovecha todo `dev`, lo que importa con los pocos datos en español.

---

## 4. Preprocesado del texto (idéntico en Python y JavaScript)

El modelo se entrena en Python y se ejecuta en JavaScript. **Si el texto no se limpia exactamente igual en los dos lados, las puntuaciones no coinciden.** Estas son las reglas, en este orden:

1. Normalizar a NFKD y **eliminar las marcas diacríticas** (categoría Unicode `Mn`): `cuéntame` → `cuentame`, `ñ` → `n`. Eliminar también los **caracteres de formato invisibles** (categoría `Cf`: espacios de ancho cero, marcas de dirección, BOM, guion suave). *Añadido tras el análisis: insertando esos caracteres, el recall del modelo ES bajaba del 92 % al 57 %* (`modelo/ANALISIS_MODELO.md`).
2. Pasar a **minúsculas** y cambiar la sigma final `ς` por `σ` (JavaScript la pone sola según el contexto; Python no).
3. Correos electrónicos → ` mailtok `.
4. Enlaces con `http(s)://` o `www.` → ` urltok `.
5. Dominios sueltos (`entregas-envio.info/pago`) → ` urltok `. El dominio debe terminar en un límite de palabra, para que `aquí.Gracias` no cuente como enlace.
6. Teléfonos (secuencias de 8 o más dígitos con espacios o guiones) → ` phonetok `.
7. Cualquier número restante → `0`.
8. Espacios múltiples → uno solo; quitar espacios al principio y al final.

> Los enlaces se sustituyen por un marcador para que el modelo aprenda "aquí hay un enlace" sin memorizar dominios concretos. **El análisis detallado de cada enlace lo hacen las reglas** (documentación principal, F5), no el modelo.

### 4.1 Python (`modelo/preprocess.py`)

```python
import re
import unicodedata

# Mismos caracteres que str.isspace() en Python (lo que usa scikit-learn para dividir palabras).
WS_CHARS = ("\t\n\x0b\x0c\r\x1c\x1d\x1e\x1f \x85\xa0\u1680"
            "\u2000-\u200a\u2028\u2029\u202f\u205f\u3000")
NOT_WS = f"[^{WS_CHARS}]"

MAIL_RE  = re.compile(r"[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}")
URL_RE   = re.compile(rf"https?://{NOT_WS}+|www\.{NOT_WS}+")
DOM_RE   = re.compile(rf"\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{{2,6}}\b(?:/{NOT_WS}*)?", re.ASCII)
PHONE_RE = re.compile(r"\+?[0-9][0-9 \-]{6,}[0-9]")
NUM_RE   = re.compile(r"[0-9]+")
WS_RE    = re.compile(f"[{WS_CHARS}]+")

def preprocess(text: str) -> str:
    t = unicodedata.normalize("NFKD", text)
    t = "".join(c for c in t if unicodedata.category(c) not in ("Mn", "Cf"))
    t = t.lower().replace("ς", "σ")
    t = MAIL_RE.sub(" mailtok ", t)
    t = URL_RE.sub(" urltok ", t)
    t = DOM_RE.sub(" urltok ", t)
    t = PHONE_RE.sub(" phonetok ", t)
    t = NUM_RE.sub("0", t)
    return WS_RE.sub(" ", t).strip()
```

### 4.2 TypeScript (`modelo/js/preprocess.ts`)

```ts
const WS_CHARS =
  "\\t\\n\\x0b\\x0c\\r\\x1c\\x1d\\x1e\\x1f \\x85\\xa0\\u1680" +
  "\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";
const NOT_WS = `[^${WS_CHARS}]`;

const MAIL_RE  = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g;
const URL_RE   = new RegExp(`https?://${NOT_WS}+|www\\.${NOT_WS}+`, "g");
const DOM_RE   = new RegExp(`\\b[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.[a-z]{2,6}\\b(?:/${NOT_WS}*)?`, "g");
const PHONE_RE = /\+?[0-9][0-9 \-]{6,}[0-9]/g;
const NUM_RE   = /[0-9]+/g;
const WS_RE    = new RegExp(`[${WS_CHARS}]+`, "g");

export function preprocess(text: string): string {
  let t = text.normalize("NFKD").replace(/[\p{Mn}\p{Cf}]/gu, "");
  t = t.toLowerCase().replace(/ς/g, "σ");
  t = t.replace(MAIL_RE, " mailtok ");
  t = t.replace(URL_RE, " urltok ");
  t = t.replace(DOM_RE, " urltok ");
  t = t.replace(PHONE_RE, " phonetok ");
  t = t.replace(NUM_RE, "0");
  return t.replace(WS_RE, " ").trim();
}
```

> **No se usa `\s`, `\S`, `\w` ni `\d`**: Python y JavaScript los definen distinto. Por ejemplo, para Python `\x1c`–`\x1f` y `\x85` son espacios y para JS no, y al revés con `\ufeff`. `\b` solo aparece en `DOM_RE`: sin la bandera `u` de JS y con `re.ASCII` en Python, los dos entienden `[A-Za-z0-9_]`. El documento original usaba `\s`, `\S` y `\b` en modo Unicode, que **pueden dar resultados distintos** en Python y en JS con esos caracteres. `npm test` comprueba 21 casos difíciles exportados desde Python (emojis, espacios Unicode, caracteres invisibles, griego, `ß`, `İ`, `ø`…).

---

## 5. Entrenamiento de los modelos

### 5.1 Modelo

Uno por idioma, con la misma receta:

```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

pipe = Pipeline([
    ("tfidf", TfidfVectorizer(
        analyzer="char_wb",     # n-gramas de caracteres dentro de cada palabra
        ngram_range=(2, 5),
        preprocessor=preprocess,
        lowercase=False,        # ya lo hace preprocess()
        sublinear_tf=True,
        min_df=2,
        max_features=30000,
    )),
    ("clf", LogisticRegression(
        class_weight="balanced",
        max_iter=2000,
        C=4.0,                  # se ajusta con validación
    )),
])
```

**Por qué esta receta:**
- **N-gramas de caracteres:** reconoce `verifique`, `verificar` y `verificacion` como parecidas y tolera faltas de ortografía, muy comunes en estafas.
- **Regresión logística:** rápida, da una probabilidad entre 0 y 1 y se exporta como una lista de números.
- **`class_weight="balanced"`:** compensa si hay más mensajes legítimos que estafas.
- **`max_features=30000`:** mantiene cada modelo en torno a 1–1,5 MB.

### 5.2 Ajuste con validación cruzada

Probar `C` en `[0.5, 1, 2, 4, 8, 16, 32]` con validación cruzada estratificada de 5 particiones sobre `dev`, y quedarse con el que dé mejor **F1 de la clase estafa** (umbral 0,5). Después, entrenar el modelo final con todo `dev`.

**Regla de parsimonia:** se elige el `C` más pequeño (más regularizado) cuyo F1 quede a menos de 0,002 del mejor, para no perseguir diferencias de milésimas que son ruido. **Resultado:** `C = 8` en los dos idiomas.

### 5.3 Umbrales de la cascada

Se calculan con las **predicciones out-of-fold** del mejor `C`, por idioma, y se guardan dentro del JSON del modelo:

| Umbral | Cómo se calcula | Significado | EN | ES |
|---|---|---|---|---|
| `T_SCAM` | El menor valor con **precisión ≥ 97 %** para la clase estafa (con al menos 10 mensajes por encima) | Por encima: estafa casi segura | 0,472 | 0,750 |
| `T_SAFE` | El mayor valor que deja por debajo **como máximo el 1 % de las estafas** | Por debajo: casi seguro que es normal | 0,135 | 0,132 |
| `T_MID` | `0.5`, o el punto medio entre los dos si `0.5` queda fuera | Separa la zona gris alta de la baja | 0,304 | 0,5 |

Si no se alcanza el 97 % de precisión, se usa el valor que más se acerque y `03_train.py` lo indica en `reports/metrics.md`, para contarlo en Devpost.

### 5.4 Métricas a calcular

Sobre el conjunto de **prueba**, por idioma:

- Precisión, *recall* y F1 de la clase estafa.
- Matriz de confusión.
- ROC-AUC.
- **Lo que más importa:** el *recall* de estafas (cuántas estafas detecta) y cuántas estafas quedan por debajo de `T_SAFE` (las que Sonny llamaría "normales" sin internet).
- Reparto por zonas de la cascada, por fuente y por subtipo.

### 5.5 Resultados actuales (prueba, 15 %)

| Modelo | Precisión | Recall | F1 | ROC-AUC | Estafas por debajo de `T_SAFE` | Legítimos por encima de `T_SCAM` |
|---|---|---|---|---|---|---|
| Sonny-EN (898 mensajes) | 96,4 % | 93,0 % | 0,946 | 0,997 | 0,7 % | 0,7 % |
| Sonny-ES (358 mensajes) | 95,4 % | 90,8 % | 0,930 | 0,978 | 0,5 % | 1,1 % |

**Análisis completo** (17 pruebas: intervalos de confianza, comparación con alternativas, calibración, robustez, generalización entre fuentes, explicabilidad, velocidad…) y guion de demostración: [`modelo/ANALISIS_MODELO.md`](modelo/ANALISIS_MODELO.md).

**Batería realista** (`modelo/05_bateria.py`, los 10 mensajes de `consideraciones.md` 11.3 y su equivalente en inglés, **no** usados para entrenar): **18/20**. Las estafas nunca salen ✅ y los legítimos nunca salen 🛑, salvo el **"familiar en apuros"**, que sale ✅ en los dos idiomas. Muchos legítimos en español salen ⚠️ (por ejemplo, *"¿Vienes a comer el domingo?"*, con p = 0,35): sin internet el modelo ES es muy prudente, y con internet esos mensajes pasan a la IA.

> Las cifras de prueba miden mensajes parecidos a los de entrenamiento. La batería es la medida más honesta. Detalle completo en `modelo/reports/`.

---

## 6. Detector de idioma

También es **un modelo propio**, entrenado con los mismos datos (columna `lang`):

```python
lang_pipe = Pipeline([
    ("tfidf", TfidfVectorizer(
        analyzer="char_wb", ngram_range=(1, 3),
        preprocessor=preprocess, lowercase=False,
        sublinear_tf=True, max_features=5000,
    )),
    ("clf", LogisticRegression(max_iter=2000)),
])
# etiqueta: 1 = es, 0 = en
```

- Si la probabilidad del idioma ganador es **≥ 0,80**, se usa ese idioma.
- Si no, se usa el **modelo principal** del usuario (sección 2.2).
- Se exporta igual que los modelos de estafa (sección 7) como `lang.sonny`, con `"task": "lang"`, `"thresholds": {"accept": 0.8}` y `"labels": {"0": "en", "1": "es"}`. En la app: `detectLang()` de `modelo/js/scorer.ts` devuelve `"en"`, `"es"` o `null` (dudoso → modelo principal).
- **Resultado:** exactitud del 99,8 % en prueba, también en mensajes de 8 palabras o menos. El 98,4 % de los mensajes supera 0,80 de confianza, y en esos acierta el 100 %.
- ⚠️ En español casi todos los correos vienen de SpaPhish. El detector podría aprender "correo o SMS" en vez de "idioma", pero softecapps aporta SMS en español y la exactitud por canal (correo 99,0 %, SMS 99,9 %) indica que no ocurre.

---

## 7. Exportación a JSON y ejecución en la app

### 7.1 Cómo calcula el modelo una puntuación

Para reproducirlo en JavaScript hay que saber exactamente qué hace scikit-learn:

1. `preprocess(texto)`.
2. Dividir por espacios. Para cada palabra `w`, añadir un espacio delante y detrás: `" " + w + " "`.
3. Sacar los n-gramas de caracteres de esa palabra, de tamaño 2 a 5 (regla exacta en 7.3).
4. Contar cuántas veces aparece cada n-grama **del vocabulario** (los que no están, se ignoran).
5. Para cada uno: `valor = (1 + ln(conteo)) × idf`.
6. Normalizar el vector (norma L2: dividir por la raíz de la suma de cuadrados).
7. `z = intercepto + Σ (valor × coeficiente)` y `p = 1 / (1 + e^(−z))`.

### 7.2 Formato del archivo

Se guarda con extensión **`.sonny`** (es JSON, pero con otra extensión para que Expo lo trate como recurso y no como código; ver 11.1).

```json
{
  "format": "sonny-lr-v1",
  "lang": "en",
  "task": "scam",
  "ngram_range": [2, 5],
  "intercept": -1.2345,
  "thresholds": { "scam": 0.91, "mid": 0.5, "safe": 0.08 },
  "vocab": {
    " ver": [3.2101, 0.8123],
    "acco": [2.9876, 0.4410]
  },
  "tests": [
    { "text": "Your package is on hold. Pay $1.99 at ...", "p": 0.9734 },
    { "text": "See you at dinner on Sunday!", "p": 0.0213 }
  ]
}
```

- `vocab`: `"n-grama": [idf, coeficiente]`, ambos redondeados a **6 decimales**. Con 6, la diferencia con scikit-learn es ≤ 1e-7. Tamaño: `en.sonny` 0,83 MB, `es.sonny` 0,82 MB, `lang.sonny` 0,14 MB.
- **No eliminar n-gramas con coeficiente cercano a cero:** siguen contando en la normalización del paso 6; quitarlos cambiaría las puntuaciones.
- `tests`: 20 mensajes del conjunto de prueba (10 por clase) con la puntuación que da Python, para comprobar la coincidencia en la app.
- Implementación: `modelo/04_export.py`. Incluye `score_rounded()`, una réplica en Python puro del cálculo de la app que verifica el modelo **ya redondeado** antes de escribirlo.

### 7.3 Ejecución en TypeScript (`modelo/js/scorer.ts`)

Resumen (el archivo tiene además `detectLang()` y el tipo completo):

```ts
type SonnyModel = {
  ngram_range: [number, number];
  intercept: number;
  thresholds: { scam: number; mid: number; safe: number };
  vocab: Record<string, [number, number]>;
};

// Réplica exacta de char_wb de scikit-learn.
// Usa Array.from para contar caracteres reales (los emojis ocupan 2 unidades en JS).
function charWbNgrams(text: string, minN: number, maxN: number): string[] {
  const out: string[] = [];
  for (const word of text.split(" ")) {
    if (!word) continue;
    const w = Array.from(" " + word + " ");
    const len = w.length;
    for (let n = minN; n <= maxN; n++) {
      let offset = 0;
      out.push(w.slice(offset, offset + n).join(""));
      while (offset + n < len) {
        offset++;
        out.push(w.slice(offset, offset + n).join(""));
      }
      if (offset === 0) break; // palabra más corta que n
    }
  }
  return out;
}

export function scoreMessage(model: SonnyModel, raw: string): number {
  const [minN, maxN] = model.ngram_range;
  const counts = new Map<string, number>();
  for (const g of charWbNgrams(preprocess(raw), minN, maxN)) {
    // hasOwnProperty y no `in`: con `in`, n-gramas como "constructor" darían falsos aciertos.
    if (Object.prototype.hasOwnProperty.call(model.vocab, g))
      counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  let norm = 0;
  const vals: Array<[number, number]> = [];
  for (const [g, c] of counts) {
    const [idf, coef] = model.vocab[g];
    const v = (1 + Math.log(c)) * idf;
    norm += v * v;
    vals.push([v, coef]);
  }
  norm = Math.sqrt(norm) || 1;
  let z = model.intercept;
  for (const [v, coef] of vals) z += (v / norm) * coef;
  return 1 / (1 + Math.exp(-z));
}
```

### 7.4 Pruebas de coincidencia (obligatorias)

- **Ya implementadas:** `cd modelo && npm test` (Node ≥ 22.18, sin dependencias) ejecuta `js/parity.test.ts`:
  - `preprocess` de JS da exactamente lo mismo que Python en los 19 casos de `exports/preprocess_cases.json`.
  - `scoreMessage` coincide con Python (< 0,001) en los `tests` de `en.sonny`, `es.sonny` y `lang.sonny`.
  - Los umbrales están ordenados y el detector de idioma acierta en ejemplos obvios.
  - `js/model.test.ts`: comportamiento (probabilidades válidas, invariancias, casos límite, claves del prototipo, velocidad).
  - `tests/` (Python, `npm run test:py`): preprocesado, exportación igual a scikit-learn y **barreras de calidad** que fallan si un reentrenamiento empeora el modelo.
  - **Estado actual: 18/18 (JS) y 17/17 (Python).**
- En la app: al cargar cada modelo en desarrollo, repetir la comprobación con `tests`.
- Si falla, la causa casi siempre está en el preprocesado (sección 4) o en los n-gramas (7.3).
- Al copiar `js/*.ts` a la app: `scorer.ts` importa `./preprocess.ts` con extensión (lo pide Node). En Expo, cambiarlo a `./preprocess` o activar `allowImportingTsExtensions`.

---

## 8. La cascada de dos filtros

### 8.1 Filtro 1 (siempre)

- Detector de idioma → modelo correspondiente → probabilidad `p`.
- Reglas de enlaces → `rulesSevere` (verdadero si detectan typosquatting de una marca, IP en lugar de dominio, punycode o subdominio engañoso).

### 8.2 Sin internet

| Puntuación | Veredicto |
|---|---|
| `p ≥ T_SCAM` | 🛑 Estafa |
| `T_SAFE ≤ p < T_SCAM` | ⚠️ Dudoso |
| `p < T_SAFE` | ✅ Parece normal (con la frase *"Pero tus claves, nunca a nadie"*) |

- Aviso visible en el resultado: *"Sin conexión: revisión básica."*
- La explicación y las recomendaciones salen de **plantillas locales** por veredicto y por señal de las reglas, en el idioma del usuario.

### 8.3 Con internet

| Puntuación del modelo | ¿Se llama a la IA? | IA dice 🛑 | IA dice ⚠️ | IA dice ✅ |
|---|---|---|---|---|
| `p ≥ T_SCAM` | **No** | — | — | — → 🛑 Estafa |
| `T_MID ≤ p < T_SCAM` | Sí | 🛑 | ⚠️ | ⚠️ |
| `T_SAFE ≤ p < T_MID` | Sí | 🛑 | ⚠️ | ✅ |
| `p < T_SAFE` | Sí | 🛑 | ⚠️ | ✅ |

- **Si la estafa es clara (`p ≥ T_SCAM`), el mensaje no sale del dispositivo.** La explicación sale de las plantillas locales. Un botón opcional **"Explícame más"** envía el mensaje a la IA **solo si el usuario lo toca**.
- **En la zona alta (`T_MID` a `T_SCAM`), la IA no puede bajar a ✅**: como mucho a ⚠️.
- **Si la IA falla, tarda más de 15 s o devuelve algo inválido:** se usa la tabla sin internet (8.2).

### 8.4 Reglas que se aplican siempre al final

- Si `rulesSevere` es verdadero, el veredicto **nunca puede ser ✅**: se sube como mínimo a ⚠️.
- **Nunca** se muestra "seguro" ni "100 %".

### 8.5 Pseudocódigo

```ts
async function analyze(text: string, user: UserSettings): Promise<Verdict> {
  const lang = detectLang(text, user.language);          // sección 6
  const model = await loadModel(lang);                   // carga perezosa
  const p = scoreMessage(model, text);
  const rules = analyzeLinks(text);                      // reglas F5
  const { scam: T_SCAM, mid: T_MID, safe: T_SAFE } = model.thresholds;

  let verdict: Level;
  let source: "model" | "model+ai" = "model";

  if (p >= T_SCAM) {
    verdict = "scam";
  } else if (!(await isOnline())) {
    verdict = p >= T_SAFE ? "suspicious" : "safe";
  } else {
    const ai = await secondOpinion(text, user).catch(() => null); // timeout 15 s
    if (!ai) {
      verdict = p >= T_SAFE ? "suspicious" : "safe";
    } else {
      source = "model+ai";
      verdict = ai.verdict;
      if (p >= T_MID && verdict === "safe") verdict = "suspicious";
    }
  }

  if (rules.severe && verdict === "safe") verdict = "suspicious";
  return buildResult(verdict, { p, lang, rules, source, user });
}
```

---

## 9. IA externa: segunda opinión, sin proveedor fijo

### 9.1 Independencia

La IA recibe **solo el mensaje, el idioma de respuesta y el trato (tú/usted)**. **No** recibe la puntuación del modelo ni las señales de las reglas, para que su opinión sea realmente independiente.

### 9.2 Cambiar de proveedor sin tocar la app

El servidor (API route de Expo) define una interfaz común y un adaptador por proveedor:

```ts
export interface AIProvider {
  secondOpinion(input: {
    text?: string;
    imageBase64?: string;          // fotos: la IA también extrae el texto
    replyLanguage: "en" | "es";
    formality: "tu" | "usted";     // solo aplica en español
  }): Promise<AIOpinion>;
}
```

Variables de entorno (solo en el servidor, nunca en la app):

```
AI_PROVIDER=gemini      # implementado: gemini (anthropic | openai: interfaz lista, sin adaptador)
AI_API_KEY=...
AI_MODEL=...            # nombre del modelo del proveedor elegido
```

Se implementa **un solo adaptador, el de Gemini** (`app/src/server/ai.ts`), y queda preparada la interfaz para los demás. Todas las variables están en `app/.env` (plantilla: `app/.env.example`).

### 9.3 Respuesta esperada (validada con `zod`)

```json
{
  "verdict": "scam",
  "extractedText": "Your package is on hold...",
  "headline": "Don't open it. It's a scam.",
  "reason": "They pretend to be a delivery company to steal your card details.",
  "steps": ["Don't tap the link.", "Delete the message."],
  "emergencySteps": ["Call your bank using the number on your card.", "Ask them to block the card."]
}
```

Límites: `headline` ≤ 8 palabras, `reason` ≤ 20 palabras, `steps` y `emergencySteps` ≤ 3 elementos cada uno. Si la validación falla, se reintenta una vez; si vuelve a fallar, se trata como "IA no disponible" (8.3).

### 9.4 Prompt (base)

> You are Sonny, a warm, patient and loyal grandson who knows a lot about scams. You help older people who are not tech-savvy. Analyze the message and reply **only** with JSON following the schema. Write in `{replyLanguage}`. If Spanish, use `{formality}` ("tú" or "usted") and neutral Latin American Spanish. Use very short sentences, no technical words (never say phishing, URL, domain, credentials). Never blame the user. Never say a message is 100% safe. If unsure between "suspicious" and "safe", choose "suspicious".

---

## 10. Ajustes del usuario

| Ajuste | Opciones | Por defecto |
|---|---|---|
| Idioma | English / Español | **English** |
| Trato (solo en español) | Tú / Usted | **Tú** |
| Voz | Activada / Desactivada | **Desactivada** |
| Contacto de confianza | Nombre + teléfono (solo en el dispositivo) | Vacío (se ofrece configurarlo la primera vez) |
| Modo detallado | Activado / Desactivado | Desactivado |

- **La voz** usa el sintetizador del propio dispositivo (`expo-speech`), no la IA. Cuando está activada, hay un botón **🔊 Escuchar** en el resultado; no se reproduce sola.
- **El resultado siempre se lee en pantalla**: veredicto, razón y recomendaciones, con letra grande. La voz es un complemento.
- Todos los ajustes se guardan solo en el dispositivo (`AsyncStorage`).

---

## 11. Empaquetado: web y APK

### 11.1 Modelos como recursos

Los modelos van en `app/assets/models/` con extensión `.sonny`. Se generan en `modelo/exports/` y se copian con `python modelo/04_export.py --app ../app`:

```
assets/models/
├── en.sonny     (~1–1,5 MB)
├── es.sonny     (~1–1,5 MB)
└── lang.sonny   (~0,2 MB)
```

Indicar a Metro que `.sonny` es un recurso (así no se mete dentro del código JavaScript y la app arranca rápido):

```js
// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push("sonny");
module.exports = config;
```

Carga perezosa:

```ts
import { Asset } from "expo-asset";
import { Platform } from "react-native";

const SOURCES = {
  en: require("../assets/models/en.sonny"),
  es: require("../assets/models/es.sonny"),
  lang: require("../assets/models/lang.sonny"),
};
const cache = new Map<string, SonnyModel>();

export async function loadModel(key: keyof typeof SOURCES): Promise<SonnyModel> {
  if (cache.has(key)) return cache.get(key)!;
  const asset = Asset.fromModule(SOURCES[key]);
  await asset.downloadAsync();
  const raw = Platform.OS === "web"
    ? await (await fetch(asset.uri)).text()
    : await readLocalFile(asset.localUri!);   // con expo-file-system
  const model = JSON.parse(raw) as SonnyModel;
  cache.set(key, model);
  return model;
}
```

> La función de lectura de archivos de `expo-file-system` cambió en versiones recientes del SDK (la API clásica está en `expo-file-system/legacy`). Usar la que corresponda a la versión de Expo instalada.

- **En la APK**, los tres archivos van dentro del paquete: el filtro 1 funciona **sin internet desde el primer uso**.
- **En la web**, se descargan la primera vez y el navegador los guarda en caché.

### 11.2 Web

```json
// app.json
{ "expo": { "web": { "output": "server" } } }
```

```bash
npx expo export --platform web
npx eas-cli deploy          # EAS Hosting: web + API route
```

### 11.3 APK

```json
// eas.json
{
  "build": {
    "preview": { "android": { "buildType": "apk" } }
  }
}
```

```bash
eas build -p android --profile preview
```

**Detalle importante:** en la web, la app llama a la API con una ruta relativa (`/api/analyze`). En la APK no hay "servidor propio", así que debe llamar a la **URL completa** del despliegue de EAS Hosting:

```
EXPO_PUBLIC_API_URL=https://<vuestro-proyecto>.expo.app
```

```ts
const API_BASE = Platform.OS === "web" ? "" : process.env.EXPO_PUBLIC_API_URL;
fetch(`${API_BASE}/api/analyze`, { ... });
```

Esta URL no es secreta (la clave de la IA sigue solo en el servidor).

### 11.4 Qué funciona en cada caso

| Función | Web con internet | APK con internet | APK sin internet |
|---|---|---|---|
| Filtro 1 (modelo + reglas) | ✅ | ✅ | ✅ |
| Filtro 2 (IA) | ✅ | ✅ | — |
| Fotos | ✅ (sin IA: OCR en el navegador) | ✅ (sin IA: ML Kit) | ✅ (ML Kit en el celular) |
| Voz (si está activada) | ✅ (según navegador) | ✅ | ✅ |
| Llamar al contacto de confianza | ✅ en celular | ✅ | ✅ |

---

## 12. Estructura del repositorio

```
sonny/
├── dataset/                     # copias locales originales (UCI, softecapps); respaldo de 01_download.py
├── modelo/                      # Python + pruebas JS  ✅ implementado
│   ├── README.md                # uso, resultados, licencias
│   ├── requirements.txt         # scikit-learn, pandas, numpy, joblib
│   ├── package.json             # npm test (pruebas de coincidencia, sin dependencias)
│   ├── config.py                # rutas, fuentes, semilla, C, objetivos de umbrales
│   ├── preprocess.py            # sección 4.1 (fuente única en Python) + casos de paridad
│   ├── 01_download.py           # descarga los datasets públicos
│   ├── 02_prepare.py            # une, corrige etiquetas, limpia, deduplica → data/processed/{en,es}.csv
│   ├── 03_train.py              # validación cruzada, C, umbrales, evaluación en prueba
│   ├── 04_export.py             # exporta en.sonny, es.sonny, lang.sonny (+ --app ../app)
│   ├── 05_bateria.py            # batería realista de consideraciones.md 11.3
│   ├── 06_analisis.py           # análisis completo -> reports/analisis.md + figuras
│   ├── ANALISIS_MODELO.md       # interpretación del análisis + guion de demo
│   ├── tests/                   # pruebas Python (unittest) + barreras de calidad
│   ├── js/
│   │   ├── preprocess.ts        # sección 4.2  → copiar a app/lib/preprocess.ts
│   │   ├── scorer.ts            # sección 7.3  → copiar a app/lib/model.ts
│   │   └── parity.test.ts       # sección 7.4
│   ├── data/
│   │   ├── raw/                 # ignorado en git (se descarga con 01_download.py)
│   │   ├── manual/              # relabel_es.csv, es_manual.csv, en_manual.csv, bateria.csv
│   │   └── processed/           # en.csv, es.csv
│   ├── artifacts/               # pipelines .joblib (ignorado en git)
│   ├── exports/                 # en.sonny, es.sonny, lang.sonny, preprocess_cases.json
│   └── reports/                 # metrics.md, metrics.json, bateria.md (para Devpost)
├── app/                         # Expo SDK 58 ✅ (estructura real en app/README.md; las pantallas están en app/src/app/)
│   ├── app/
│   │   ├── index.tsx
│   │   ├── result.tsx
│   │   ├── settings.tsx
│   │   └── api/analyze+api.ts   # segunda opinión (IA)
│   ├── assets/models/           # en.sonny, es.sonny, lang.sonny
│   ├── lib/
│   │   ├── preprocess.ts        # sección 4.2
│   │   ├── model.ts             # secciones 7.3 y 11.1
│   │   ├── cascade.ts           # sección 8
│   │   ├── urlAnalyzer.ts       # reglas de enlaces
│   │   ├── templates.ts         # explicaciones locales (EN / ES, tú / usted)
│   │   └── ai/                  # interfaz + adaptador del proveedor elegido
│   ├── metro.config.js
│   ├── eas.json
│   └── .env.example
└── README.md                    # instalación, uso, métricas y atribuciones
```

---

## 13. Métricas, licencias y lo que se cuenta en Devpost

### 13.1 Qué publicar

- Tamaño de cada dataset final (por idioma y por clase).
- Precisión, *recall* y F1 de cada modelo **en el conjunto de prueba**.
- Una frase honesta sobre la limitación del español (sección 3.3).
- Diagrama de la cascada (sección 1).

Ejemplo de frase: *"Sonny runs two models we trained ourselves, one for English and one for Spanish, directly on the device. On our held-out test set, the English model catches X% of scams and the Spanish model Y%. When online, a second AI opinion reviews every message except the obvious scams, which never leave the phone."*

### 13.2 Atribuciones obligatorias (README)

Las licencias CC BY 4.0 exigen citar la fuente. En el README, sección **"Datasets & licenses"**:

- **SMS Spam Collection** — Tiago A. Almeida y José María Gómez Hidalgo, UCI Machine Learning Repository. CC BY 4.0.
- **SMS Phishing Dataset for Machine Learning and Pattern Recognition** — Mishra y Soni, Mendeley Data (`10.17632/f45bkkt8pr.1`). CC BY 4.0.
- **SpaPhish** — Bustio-Martínez et al., Mendeley Data (`10.17632/hz2d6gz7pc.5`). CC BY 4.0.
- **softecapps/spam_ham_spanish** — Hugging Face (`10.57967/hf/2264`). Apache-2.0. Con 10 etiquetas corregidas.
- Mensajes recopilados por el equipo, anonimizados *(cuando los haya)*.
- **Cambios realizados** (CC BY 4.0 exige indicarlos): duplicados eliminados, `U+FFFD` sustituido, correos recortados a asunto + 500 caracteres, etiquetas corregidas según `relabel_es.csv`.

La tabla completa ya está en `modelo/README.md`. Comprobar en la página de cada dataset la forma exacta de citarlo antes de publicar.

---

## 14. Cambios respecto a los documentos anteriores

| Tema | Antes | Ahora |
|---|---|---|
| Idioma por defecto | Español | **Inglés**, con selección al primer uso |
| Motor de detección | Solo IA externa | **Dos modelos propios** + reglas + IA como segunda opinión |
| Sin internet | Opcional, solo reglas | **Modelo completo en el dispositivo** |
| Voz | Automática al mostrar el resultado (`consideraciones.md` 2.3) | **Desactivada por defecto**; botón "Escuchar" si se activa |
| Prioridad | Voz y texto | **Texto en pantalla** (veredicto, razón, recomendaciones) |
| Trato | Sin decidir | **Tú** por defecto, **usted** en Ajustes |
| Proveedor de IA | Claude, OpenAI o Gemini | **Gemini**; interfaz intercambiable |
| Español | Variante de España (móvil, Correos, Bizum, Hacienda) | **Neutro latinoamericano** |
| Regla "si pide dinero, claves o códigos, mínimo dudoso" (`consideraciones.md` 8.1) | Por palabras clave | **Eliminada**: marcaba como dudosos los códigos legítimos de los bancos. Lo decide el modelo y la IA |
| Entregables | Web | **Web + APK** |
| Carpeta de entrenamiento | `training/` | **`modelo/`** |
| Validación | 70/15/15 con validación fija; reentrenar con validación | **85/15 + validación cruzada de 5 particiones**; umbrales *out-of-fold* |
| Datasets | ealvaradob y SpamShield "si se pueden filtrar" | **Descartados** (no se pueden filtrar). Añadidos **Mishra y Soni** (EN) y **softecapps** (ES) |
| Preprocesado | `\s`, `\S`, `\b` en modo Unicode | **Clases explícitas** iguales en Python y JS, más sigma final |
| Exportación | 4 decimales | **6 decimales** |

Todo lo demás de los documentos anteriores (diseño para mayores, personalidad de Sonny, pantallas, privacidad, pruebas con usuarios, reglas del hackathon) sigue vigente. Los textos de ejemplo en español de los otros dos documentos ya se pasaron a **español neutro latinoamericano**.

---

## 15. Orden de trabajo

El cierre es el **7 de noviembre de 2026 a las 5:00 pm EST**. Orden recomendado, con duración aproximada:

| # | Tarea | Duración aprox. | Se puede hacer en paralelo con |
|---|---|---|---|
| 1 | Proyecto Expo, repositorio, primer despliegue en EAS Hosting | 1 h | 2 |
| 2 | ~~Descargar datasets, revisar licencias y columnas (`01`, `02`)~~ | ✅ hecho | — |
| 3 | Recopilar y anonimizar mensajes reales en español → `modelo/data/manual/es_manual.csv`; después volver a ejecutar `02`–`05` (2 min) | 2 h | 1, 5 |
| 4 | ~~Entrenar y evaluar los dos modelos y el detector (`03`)~~ | ✅ hecho | — |
| 5 | Interfaz: inicio, resultado, ajustes (texto primero) | 3 h | 3 |
| 6 | ~~Exportar modelos y pruebas de coincidencia~~ ✅. Falta: copiar `modelo/js/*.ts` a `app/lib/` y `04_export.py --app ../app` | 0,5 h | — |
| 7 | Cascada + API route + adaptador de IA | 2 h | — |
| 8 | Reglas de enlaces, plantillas locales EN/ES | 1,5 h | 7 |
| 9 | APK con EAS Build y prueba sin internet | 1 h | 10 |
| 10 | Video, capturas, README con métricas y atribuciones, página de Devpost | 3 h | 9 |

> Si el tiempo aprieta: priorizar **1, 2, 4, 5, 6, 7 y 10**. Las reglas de enlaces, la APK y las fotos pueden quedar mencionadas como "en desarrollo".

---

## 16. Riesgos conocidos y puntos abiertos

| Punto | Estado | Qué hacer |
|---|---|---|
| Poco dato de **SMS reales en español** | Riesgo alto | Recopilar mensajes reales (3.4); explicar la limitación en Devpost |
| **"Familiar en apuros"** sale ✅ sin internet (EN y ES) | **Riesgo alto**, comprobado en la batería | Añadir ejemplos reales a `data/manual/` y reentrenar. Mientras tanto, la IA lo revisa cuando hay internet |
| Modelo ES muy prudente: muchos legítimos salen ⚠️ sin internet | Riesgo medio | Aceptable (⚠️ no asusta y con internet decide la IA). Mejora con mensajes legítimos reales |
| softecapps: plantillas y etiquetas con ruido | Asumido | 10 correcciones documentadas; contarlo en Devpost |
| "Spam" incluye publicidad, no solo estafas | Asumido | El veredicto ⚠️ y la IA lo matizan |
| SpamShield (restringido, 35–40 % sintético) y ealvaradob (sin origen) | **Descartados** | — |
| ¿Los mensajes recopilados de alertas oficiales cuentan como "reales"? | **Decidido: sí**, porque son textos reales de estafas | — |
| Proveedor de IA | **Decidido: Gemini** | Falta probarlo con una clave real |
| Umbrales con pocos datos en español | Controlado | Se alcanzó el 97 % de precisión en los dos idiomas |
| Fotos sin internet | **Resuelto**: OCR en el dispositivo (tesseract.js en la web, ML Kit en la APK) | Probado en la web con la IA caída: lee la captura en unos 5 s. En la APK, falta probarlo en un celular |
| Coincidencia Python ↔ JavaScript | **Resuelto** | `npm test` 18/18 y `npm run test:py` 17/17; repetir tras cada reentrenamiento |
| **Ataque con caracteres invisibles** (recall ES 92 % → 57 %) | **Resuelto** | El preprocesado elimina los caracteres Unicode `Cf`; prueba automática |
| **Atajo tú/usted** en el modelo ES ("su" → estafa, "tu" → legítimo) | Riesgo alto | Estafas reales de tú y legítimos reales de usted en `data/manual/` |
| El modelo ES **no generaliza entre estilos** (AUC 0,51 de SMS a correo) | Riesgo alto | Mensajes reales; volver a ejecutar `06_analisis.py` |
| Ofuscación l33t (recall ES 91 % → 62 %) | Riesgo medio | Ninguna estafa pasa a ✅; normalizar l33t como trabajo futuro |

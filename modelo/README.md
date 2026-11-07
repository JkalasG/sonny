# Sonny — modelo/

Los **modelos propios** de Sonny: un clasificador de estafas en inglés (Sonny-EN), otro en español (Sonny-ES) y un detector de idioma. Se entrenan en Python, se exportan a JSON (`.sonny`) y se ejecutan en la app (TypeScript), en el dispositivo y sin internet.

Diseño completo: [`../Sonny_Modelo_y_Arquitectura.md`](../Sonny_Modelo_y_Arquitectura.md), secciones 3 a 7.

## Uso rápido

```bash
cd modelo
pip install -r requirements.txt     # Python 3.10 o superior
python 01_download.py               # datasets públicos -> data/raw/
python 02_prepare.py                # une, limpia, deduplica -> data/processed/{en,es}.csv
python 03_train.py                  # validación cruzada, umbrales, prueba -> artifacts/, reports/
python 04_export.py                 # -> exports/{en,es,lang}.sonny  (+ --app ../app para copiarlos)
python 05_bateria.py                # batería de mensajes realistas -> reports/bateria.md
python 06_analisis.py               # análisis completo (17 pruebas) -> reports/analisis.md + figuras
npm test                            # 18 pruebas JS: coincidencia con Python y comportamiento (Node >= 22.18)
npm run test:py                     # 17 pruebas Python + barreras de calidad
npm run all                         # todo lo anterior seguido (02 a 06 + pruebas), ~3 min
```

## Estructura

```
modelo/
├── config.py              # rutas, fuentes, semilla, rejilla de C, objetivos de umbrales
├── preprocess.py          # preprocesado (fuente única en Python) + casos de paridad
├── 01_download.py         # descarga (con copia de ../dataset/ si falla)
├── 02_prepare.py          # unión, correcciones de etiquetas, deduplicado, división dev/test
├── 03_train.py            # entrenamiento y métricas
├── 04_export.py           # exportación a .sonny + réplica en Python del cálculo de la app
├── 05_bateria.py          # evaluación con la batería de consideraciones.md 11.3
├── 06_analisis.py         # análisis completo -> reports/analisis.md, reports/figuras/
├── ANALISIS_MODELO.md     # 📊 interpretación del análisis + guion de demo para el hackathon
├── tests/                 # test_preprocess.py, test_modelo.py (unittest + barreras de calidad)
├── js/
│   ├── preprocess.ts      # réplica exacta de preprocess.py  -> copiar a app/lib/
│   ├── scorer.ts          # scoreMessage(), detectLang()      -> copiar a app/lib/model.ts
│   ├── parity.test.ts     # coincidencia con Python (npm test)
│   ├── model.test.ts      # comportamiento: invariancias, casos límite, velocidad (npm test)
│   └── bench.ts           # velocidad y tamaño (npm run bench)
├── data/
│   ├── raw/               # descargado (ignorado en git)
│   ├── manual/            # relabel_es.csv, es_manual.csv, en_manual.csv, bateria.csv
│   └── processed/         # en.csv, es.csv (con columna split = dev | test)
├── artifacts/             # pipelines de scikit-learn .joblib (ignorado en git)
├── exports/               # en.sonny, es.sonny, lang.sonny, preprocess_cases.json
└── reports/               # metrics.md, metrics.json, bateria.md
```

## Resultados actuales (conjunto de prueba, 15 %)

| Modelo | Mensajes | Precisión | Recall | F1 | ROC-AUC | Estafas que sin internet saldrían ✅ |
|---|---|---|---|---|---|---|
| Sonny-EN | 5.981 | 96,4 % | 93,0 % | 0,946 | 0,997 | 0,7 % |
| Sonny-ES | 2.384 | 95,4 % | 90,8 % | 0,930 | 0,978 | 0,5 % |
| Idioma | 8.365 | exactitud 99,8 % | | | | |

Detalle por fuente, zonas de la cascada y umbrales: [`reports/metrics.md`](reports/metrics.md).

**📊 Análisis completo** (intervalos de confianza, comparación con alternativas, calibración, robustez, el ataque de caracteres invisibles que encontramos y arreglamos, explicabilidad, límites y guion de demo): [`ANALISIS_MODELO.md`](ANALISIS_MODELO.md).

**Batería realista** ([`reports/bateria.md`](reports/bateria.md)): 18/20. Falla el **"familiar en apuros"** ("Hola mamá, se me rompió el celular…") en los dos idiomas: ningún dataset público lo trae. Se arregla añadiendo mensajes reales a `data/manual/` (ver su README).

> ⚠️ Las métricas de prueba miden mensajes **parecidos a los de entrenamiento**. Con SMS reales en español el modelo ES será peor; la batería es la medida más honesta que tenemos.

## Detalles que no hay que romper

- **Preprocesado idéntico** en `preprocess.py` y `js/preprocess.ts`. No usar `\s`, `\S`, `\w` ni `\d` (cada lenguaje los define distinto). `npm test` lo comprueba con casos difíciles (emojis, espacios Unicode, griego, `ß`, `İ`…).
- **Umbrales** calculados con predicciones *out-of-fold* (validación cruzada de 5 particiones sobre `dev`), no con un modelo distinto del final.
- **No podar el vocabulario**: todos los n-gramas cuentan en la normalización L2.
- `js/scorer.ts` importa `./preprocess.ts` con extensión (lo pide Node). En la app de Expo, cambiarlo a `./preprocess` o activar `allowImportingTsExtensions` en `tsconfig.json`.

## Datasets y licencias

| Dataset | Idioma | Uso | Licencia |
|---|---|---|---|
| [SMS Spam Collection](https://archive.ics.uci.edu/dataset/228/sms+spam+collection) — Tiago A. Almeida y José María Gómez Hidalgo (UCI) | EN | ✅ | CC BY 4.0 |
| [SMS Phishing Dataset for Machine Learning and Pattern Recognition](https://data.mendeley.com/datasets/f45bkkt8pr/1) — Mishra y Soni (Mendeley Data) | EN | ✅ (ham / spam / smishing) | CC BY 4.0 |
| [SpaPhish](https://data.mendeley.com/datasets/hz2d6gz7pc) — Bustio-Martínez et al. (Mendeley Data), v5 | ES | ✅ correos: asunto + 500 caracteres | CC BY 4.0 |
| [softecapps/spam_ham_spanish](https://huggingface.co/datasets/softecapps/spam_ham_spanish) (Hugging Face) | ES | ✅ con 10 etiquetas corregidas (`data/manual/relabel_es.csv`) | Apache-2.0 |
| [ealvaradob/phishing-dataset](https://huggingface.co/datasets/ealvaradob/phishing-dataset) | EN | ❌ mezcla SMS y correos sin columna de origen; su parte SMS es el dataset de Mishra y Soni, que usamos directamente | Apache-2.0 |
| SpamShield Datasets (Hugging Face) | EN/ES | ❌ acceso restringido y 35–40 % sintético según su ficha | CC BY 4.0 |
| Smishtank | EN | ❌ sin licencia | — |

Cambios realizados sobre los datos (exigido por CC BY 4.0): eliminación de duplicados, sustitución del carácter `U+FFFD`, recorte de los correos de SpaPhish y las correcciones de etiquetas listadas.

> ℹ️ `softecapps/spam_ham_spanish` parece contener mensajes plantilla, posiblemente generados, y su "spam" incluye publicidad. Lo usamos porque son los únicos SMS cortos en español con licencia abierta; es una excepción a la política "solo mensajes reales" que se explica en Devpost.

# data/manual

| Archivo | Para qué sirve |
|---|---|
| `relabel_es.csv` | Correcciones de etiquetas evidentes en **softecapps/spam_ham_spanish**. `02_prepare.py` las aplica y marca la fila con `relabeled=1`. El archivo original no se toca. |
| `es_manual.csv` | Mensajes **reales** en español recopilados a mano (alertas oficiales, SMS/WhatsApp del equipo y familia con permiso). |
| `en_manual.csv` | Lo mismo en inglés (opcional). |

## Cómo añadir mensajes reales (`es_manual.csv`, `en_manual.csv`)

Columnas:

| Columna | Valores | Ejemplo |
|---|---|---|
| `text` | Texto del mensaje, **anonimizado** | `Hola mamá, se me rompió el celular, este es mi número nuevo` |
| `label` | `1` = estafa, `0` = legítimo | `1` |
| `channel` | `sms`, `whatsapp`, `email` | `whatsapp` |
| `source_detail` | De dónde salió | `alerta ASFI 2025-03`, `celular equipo` |

Reglas:
- **Anonimizar siempre**: nombres → `Ana`, teléfonos → `70000000`, cuentas → `0000-0000`.
- Incluir también **legítimos** (códigos de verificación, citas, avisos de entrega reales, mensajes familiares). Objetivo: 150 + 150 como mínimo.
- Nada traducido ni generado con IA.
- Después: `python 02_prepare.py && python 03_train.py && python 04_export.py && npm test`.

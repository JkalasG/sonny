# Métricas de los modelos de Sonny

Generado por `03_train.py`. Conjunto de **prueba** (15 %, separado antes de entrenar).

## Sonny-EN

- Datos: 5981 mensajes (944 estafa/spam). Por fuente: `mendeley_sms` 844 (324 estafa), `uci_sms` 5137 (620 estafa)
- C = 8 · vocabulario = 30000 n-gramas
- Umbrales: T_SCAM = 0.4722, T_MID = 0.3035, T_SAFE = 0.1349
  - ⚠️ T_MID fuera de [T_SAFE, T_SCAM]; se usa el punto medio

| Métrica (umbral 0,5) | Valor |
|---|---|
| Precisión | 96.4% |
| Recall (estafas detectadas) | 93.0% |
| F1 | 0.946 |
| ROC-AUC | 0.997 |
| Matriz (tn, fp, fn, tp) | 751, 5, 10, 132 |

| Zona de la cascada | Mensajes | Estafas | Legítimos |
|---|---|---|---|
| 🛑 p ≥ T_SCAM (no se envía a la IA) | 137 | 132 | 5 |
| ⚠️ T_MID ≤ p < T_SCAM | 6 | 3 | 3 |
| ⚠️ T_SAFE ≤ p < T_MID | 40 | 6 | 34 |
| ✅ p < T_SAFE | 715 | 1 | 714 |

- Estafas que **sin internet** saldrían como "parece normal": **0.7 %**
- Legítimos marcados como estafa sin consultar a la IA: **0.66 %**

| Fuente | n | Precisión | Recall | F1 |
|---|---|---|---|---|
| `mendeley_sms` | 127 | 98.0% | 98.0% | 0.980 |
| `uci_sms` | 771 | 95.5% | 90.3% | 0.928 |

| Subtipo | n | Detectados (p ≥ 0,5) | Por debajo de T_SAFE |
|---|---|---|---|
| ham | 756 | 5 | 714 |
| smishing | 29 | 28 | 0 |
| spam | 113 | 104 | 1 |

## Sonny-ES

- Datos: 2384 mensajes (1223 estafa/spam). Por fuente: `softecapps` 1055 (557 estafa), `spaphish` 1329 (666 estafa)
- C = 8 · vocabulario = 29976 n-gramas
- Umbrales: T_SCAM = 0.7502, T_MID = 0.5, T_SAFE = 0.132

| Métrica (umbral 0,5) | Valor |
|---|---|
| Precisión | 95.4% |
| Recall (estafas detectadas) | 90.8% |
| F1 | 0.930 |
| ROC-AUC | 0.978 |
| Matriz (tn, fp, fn, tp) | 166, 8, 17, 167 |

| Zona de la cascada | Mensajes | Estafas | Legítimos |
|---|---|---|---|
| 🛑 p ≥ T_SCAM (no se envía a la IA) | 140 | 138 | 2 |
| ⚠️ T_MID ≤ p < T_SCAM | 35 | 29 | 6 |
| ⚠️ T_SAFE ≤ p < T_MID | 81 | 16 | 65 |
| ✅ p < T_SAFE | 102 | 1 | 101 |

- Estafas que **sin internet** saldrían como "parece normal": **0.54 %**
- Legítimos marcados como estafa sin consultar a la IA: **1.15 %**

| Fuente | n | Precisión | Recall | F1 |
|---|---|---|---|---|
| `softecapps` | 159 | 95.1% | 92.9% | 0.940 |
| `spaphish` | 199 | 95.7% | 89.0% | 0.922 |

| Subtipo | n | Detectados (p ≥ 0,5) | Por debajo de T_SAFE |
|---|---|---|---|
| ham | 174 | 8 | 101 |
| phishing | 100 | 89 | 1 |
| spam | 84 | 78 | 0 |

## Detector de idioma

- Exactitud: 99.8% · mensajes de ≤ 8 palabras: 99.8%
- Por canal: email 99.0%, sms 99.9%
- Con confianza ≥ 0.8: 98.4% de los mensajes, exactitud 100.0%

"""Rutas, fuentes y parámetros compartidos por los scripts de modelo/."""

from __future__ import annotations

import sys
from pathlib import Path

# La consola de Windows no siempre usa UTF-8.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
RAW = DATA / "raw"
MANUAL = DATA / "manual"
PROCESSED = DATA / "processed"
ARTIFACTS = ROOT / "artifacts"   # pipelines de scikit-learn (joblib), ignorado en git
EXPORTS = ROOT / "exports"       # en.sonny, es.sonny, lang.sonny (van a la app)
REPORTS = ROOT / "reports"       # métricas para Devpost

SEED = 42
TEST_SIZE = 0.15                 # prueba: se mira una sola vez, al final
CV_FOLDS = 5                     # validación cruzada sobre el 85 % restante
C_GRID = [0.5, 1, 2, 4, 8, 16, 32]
C_TOLERANCE = 0.002              # se elige el menor C a menos de esto del mejor F1

# Umbrales de la cascada (sección 5.3 del documento de arquitectura).
TARGET_SCAM_PRECISION = 0.97     # T_SCAM: precisión mínima de la clase estafa
MAX_SCAMS_BELOW_SAFE = 0.01      # T_SAFE: como máximo el 1 % de las estafas por debajo
LANG_ACCEPT = 0.80               # detector de idioma: confianza mínima

SCAM_TFIDF = dict(analyzer="char_wb", ngram_range=(2, 5), sublinear_tf=True,
                  min_df=2, max_features=30000)
LANG_TFIDF = dict(analyzer="char_wb", ngram_range=(1, 3), sublinear_tf=True,
                  max_features=5000)

# Fuentes públicas. Licencias comprobadas el 2026-11-07.
SOURCES = {
    "uci_sms": {
        "url": "https://archive.ics.uci.edu/static/public/228/sms+spam+collection.zip",
        "dest": RAW / "uci_sms" / "smsspamcollection.zip",
        "local_fallback": ROOT.parent / "dataset" / "SMSSpamCollection",
        "license": "CC BY 4.0",
    },
    "mendeley_sms": {
        # SMS Phishing Dataset for Machine Learning and Pattern Recognition (Mishra & Soni).
        "url": "https://data.mendeley.com/public-files/datasets/f45bkkt8pr/files/"
               "edb361de-918d-469f-9106-e84823830665/file_downloaded",
        "dest": RAW / "mendeley_sms" / "Dataset_5971.zip",
        "license": "CC BY 4.0",
    },
    "spaphish": {
        "url": "https://data.mendeley.com/public-files/datasets/hz2d6gz7pc/files/"
               "f796c8e2-3768-4c2d-8b73-48f0d7771de5/file_downloaded",
        "dest": RAW / "spaphish" / "spaphish.csv",
        "license": "CC BY 4.0",
    },
    "softecapps_train": {
        "url": "https://huggingface.co/datasets/softecapps/spam_ham_spanish/resolve/main/train.csv",
        "dest": RAW / "softecapps" / "train.csv",
        "local_fallback": ROOT.parent / "dataset" / "train.csv",
        "license": "Apache-2.0",
    },
    "softecapps_test": {
        "url": "https://huggingface.co/datasets/softecapps/spam_ham_spanish/resolve/main/test.csv",
        "dest": RAW / "softecapps" / "test.csv",
        "local_fallback": ROOT.parent / "dataset" / "test.csv",
        "license": "Apache-2.0",
    },
}

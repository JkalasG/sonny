"""Pruebas de los modelos exportados y barreras de calidad.

Requieren haber ejecutado 02-05. Ejecutar desde modelo/:  python -m unittest -v
Las barreras fallan si un reentrenamiento empeora el modelo por debajo de lo aceptado.
"""

import json
import sys
import unittest
from importlib import import_module
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import joblib  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

import config as C  # noqa: E402

score_rounded = import_module("04_export").score_rounded

# Mínimos aceptados en el conjunto de prueba (los actuales están en reports/metrics.md).
GATES = {
    "en": {"f1": 0.92, "recall": 0.90, "auc": 0.98, "scams_safe_pct": 2.0},
    "es": {"f1": 0.90, "recall": 0.88, "auc": 0.96, "scams_safe_pct": 2.0},
}
MIN_BATTERY = 18          # de 20
MIN_LANG_ACC = 0.98


def load_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


class TestExportacion(unittest.TestCase):
    """El .sonny (lo que usa la app) da lo mismo que el pipeline de scikit-learn."""

    def test_sonny_igual_a_scikit_learn(self):
        for lang in ("en", "es"):
            model = load_json(C.EXPORTS / f"{lang}.sonny")
            pipe = joblib.load(C.ARTIFACTS / f"{lang}.joblib")
            df = pd.read_csv(C.PROCESSED / f"{lang}.csv", encoding="utf-8")
            sample = df[df.split == "test"].sample(200, random_state=0).text.tolist()
            p_sk = pipe.predict_proba(sample)[:, 1]
            p_js = np.array([score_rounded(model, t) for t in sample])
            self.assertLess(np.abs(p_sk - p_js).max(), 1e-5, lang)

    def test_formato(self):
        for name in ("en.sonny", "es.sonny", "lang.sonny"):
            m = load_json(C.EXPORTS / name)
            self.assertEqual(m["format"], "sonny-lr-v1")
            self.assertEqual(m["ngram_range"], [2, 5] if name != "lang.sonny" else [1, 3])
            self.assertGreaterEqual(len(m["tests"]), 20)
            self.assertTrue(all(len(v) == 2 for v in m["vocab"].values()))

    def test_tamano(self):
        for name, max_mb in (("en.sonny", 1.5), ("es.sonny", 1.5), ("lang.sonny", 0.3)):
            self.assertLess((C.EXPORTS / name).stat().st_size / 1e6, max_mb, name)

    def test_umbrales_ordenados(self):
        for lang in ("en", "es"):
            th = load_json(C.EXPORTS / f"{lang}.sonny")["thresholds"]
            self.assertTrue(0 < th["safe"] <= th["mid"] <= th["scam"] < 1, th)


class TestBarrerasDeCalidad(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.metrics = load_json(C.REPORTS / "metrics.json")

    def test_metricas_en_prueba(self):
        for lang, g in GATES.items():
            m = self.metrics[lang]["test@0.5"]
            z = self.metrics[lang]["test_cascade_zones"]
            with self.subTest(lang=lang):
                self.assertGreaterEqual(m["f1"], g["f1"])
                self.assertGreaterEqual(m["recall"], g["recall"])
                self.assertGreaterEqual(m["roc_auc"], g["auc"])
                self.assertLessEqual(z["scams_called_safe_offline_pct"], g["scams_safe_pct"])

    def test_detector_de_idioma(self):
        self.assertGreaterEqual(self.metrics["lang_detector"]["accuracy"], MIN_LANG_ACC)

    def test_bateria_realista(self):
        bat = pd.read_csv(C.MANUAL / "bateria.csv", encoding="utf-8")
        ok = 0
        for r in bat.itertuples():
            m = load_json(C.EXPORTS / f"{r.lang}.sonny")
            p, th = score_rounded(m, r.text), m["thresholds"]
            ok += (r.label == 1 and p >= th["safe"]) or (r.label == 0 and p < th["scam"])
        self.assertGreaterEqual(ok, MIN_BATTERY)


if __name__ == "__main__":
    unittest.main()

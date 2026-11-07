"""Exporta los pipelines a JSON (.sonny) para ejecutarlos en la app.

Salida en exports/:
  en.sonny, es.sonny     modelos de estafa (formato sonny-lr-v1)
  lang.sonny             detector de idioma (p = probabilidad de "es")
  preprocess_cases.json  casos de preprocesado con su salida esperada (test JS)

Copiar los tres .sonny a app/assets/models/ (o usar --app ../app).

Uso:  python 04_export.py [--app RUTA_APP]
"""

from __future__ import annotations

import argparse
import json
import math
import shutil

import joblib
import numpy as np
import pandas as pd

import config as C
from preprocess import PARITY_CASES, preprocess

DECIMALS = 6        # idf y coeficientes; con 6 la diferencia con Python queda < 1e-5
N_TESTS = 20


# Casos límite: también se comprueba que JS y Python coinciden con ellos.
EDGE_TESTS = [
    "",
    "😀😀😀",
    "constructor __proto__ toString hasOwnProperty valueOf",
    "a",
    "URGENTE " * 300,
    "Ver" + chr(0x200C) + "ifique su cuenta en banco-seguro.xyz ya",
]


def pick_tests(df: pd.DataFrame, label_col: str) -> list[str]:
    test = df[df.split == "test"]
    per_class = N_TESTS // 2
    picks = [g.sample(min(per_class, len(g)), random_state=C.SEED)
             for _, g in test.groupby(label_col)]
    return pd.concat(picks).text.tolist() + EDGE_TESTS


def export(pipe, path, *, lang: str, task: str, thresholds: dict, tests: list[str],
           extra: dict | None = None) -> float:
    tfidf, clf = pipe.named_steps["tfidf"], pipe.named_steps["clf"]
    idf, coef = tfidf.idf_, clf.coef_[0]
    vocab = {g: [round(float(idf[i]), DECIMALS), round(float(coef[i]), DECIMALS)]
             for g, i in sorted(tfidf.vocabulary_.items(), key=lambda kv: kv[1])}
    probs = pipe.predict_proba(tests)[:, 1]
    out = {
        "format": "sonny-lr-v1",
        "lang": lang,
        "task": task,
        "ngram_range": list(tfidf.ngram_range),
        "intercept": round(float(clf.intercept_[0]), DECIMALS),
        "thresholds": thresholds,
        **(extra or {}),
        "vocab": vocab,
        "tests": [{"text": t, "p": round(float(p), 6)} for t, p in zip(tests, probs)],
    }
    path.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    # Comprobación en Python con el modelo YA redondeado (lo que verá la app).
    return max(abs(score_rounded(out, t) - p) for t, p in zip(tests, probs))


def score_rounded(model: dict, raw: str) -> float:
    """Réplica en Python puro de lo que hace js/scorer.ts."""
    lo, hi = model["ngram_range"]
    counts: dict[str, int] = {}
    for word in preprocess(raw).split(" "):
        if not word:
            continue
        w = " " + word + " "
        for n in range(lo, hi + 1):
            offset = 0
            grams = [w[offset:offset + n]]
            while offset + n < len(w):
                offset += 1
                grams.append(w[offset:offset + n])
            for g in grams:
                if g in model["vocab"]:
                    counts[g] = counts.get(g, 0) + 1
            if offset == 0:
                break
    vals = [((1 + math.log(c)) * model["vocab"][g][0], model["vocab"][g][1])
            for g, c in counts.items()]
    norm = math.sqrt(sum(v * v for v, _ in vals)) or 1.0
    z = model["intercept"] + sum(v / norm * coef for v, coef in vals)
    return 1 / (1 + math.exp(-z))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--app", help="ruta de la app Expo; copia los .sonny a assets/models/")
    args = ap.parse_args()

    C.EXPORTS.mkdir(exist_ok=True)
    report = json.loads((C.REPORTS / "metrics.json").read_text(encoding="utf-8"))

    for lang in ("en", "es"):
        pipe = joblib.load(C.ARTIFACTS / f"{lang}.joblib")
        df = pd.read_csv(C.PROCESSED / f"{lang}.csv", encoding="utf-8")
        th = {k: v for k, v in report[lang]["thresholds"].items() if k != "notes"}
        path = C.EXPORTS / f"{lang}.sonny"
        diff = export(pipe, path, lang=lang, task="scam", thresholds=th,
                      tests=pick_tests(df, "label"))
        print(f"[+] {path.name}: {path.stat().st_size / 1e6:.2f} MB  "
              f"(máx. diferencia tras redondeo: {diff:.2e})")

    pipe = joblib.load(C.ARTIFACTS / "lang.joblib")
    df = pd.concat([pd.read_csv(C.PROCESSED / f"{l}.csv", encoding="utf-8") for l in ("en", "es")])
    path = C.EXPORTS / "lang.sonny"
    diff = export(pipe, path, lang="multi", task="lang", thresholds={"accept": C.LANG_ACCEPT},
                  tests=pick_tests(df, "lang"), extra={"labels": {"0": "en", "1": "es"}})
    print(f"[+] {path.name}: {path.stat().st_size / 1e6:.2f} MB  (máx. diferencia: {diff:.2e})")

    cases = [{"text": t, "expected": preprocess(t)} for t in PARITY_CASES]
    (C.EXPORTS / "preprocess_cases.json").write_text(
        json.dumps(cases, ensure_ascii=True, indent=1), encoding="utf-8")
    print(f"[+] preprocess_cases.json: {len(cases)} casos")

    if args.app:
        dest = (C.ROOT / args.app / "assets" / "models").resolve()
        dest.mkdir(parents=True, exist_ok=True)
        for name in ("en.sonny", "es.sonny", "lang.sonny"):
            shutil.copy(C.EXPORTS / name, dest / name)
        print(f"[+] copiados a {dest}")


if __name__ == "__main__":
    main()

"""Entrena Sonny-EN, Sonny-ES y el detector de idioma.

Por idioma:
  1. Sobre `dev` (85 %): validación cruzada estratificada de 5 particiones para
     elegir C (mejor F1 de la clase estafa).
  2. Con las predicciones fuera de partición (out-of-fold) del mejor C se
     calculan los umbrales T_SCAM / T_MID / T_SAFE. Así los umbrales se calibran
     sobre mensajes que el modelo no vio, con la misma receta del modelo final.
  3. Se entrena el modelo final con todo `dev`.
  4. Se evalúa UNA vez sobre `test` (15 %) -> reports/.

Uso:  python 03_train.py
"""

from __future__ import annotations

import json

import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (confusion_matrix, f1_score, precision_recall_fscore_support,
                             roc_auc_score)
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.pipeline import Pipeline

import config as C
from preprocess import preprocess


def scam_pipeline(c: float) -> Pipeline:
    return Pipeline([
        ("tfidf", TfidfVectorizer(preprocessor=preprocess, lowercase=False, **C.SCAM_TFIDF)),
        ("clf", LogisticRegression(class_weight="balanced", max_iter=2000, C=c)),
    ])


def lang_pipeline() -> Pipeline:
    return Pipeline([
        ("tfidf", TfidfVectorizer(preprocessor=preprocess, lowercase=False, **C.LANG_TFIDF)),
        ("clf", LogisticRegression(max_iter=2000)),
    ])


def oof_proba(pipe: Pipeline, X, y) -> np.ndarray:
    cv = StratifiedKFold(n_splits=C.CV_FOLDS, shuffle=True, random_state=C.SEED)
    return cross_val_predict(pipe, X, y, cv=cv, method="predict_proba")[:, 1]


def thresholds(p: np.ndarray, y: np.ndarray) -> dict:
    """Umbrales de la cascada a partir de probabilidades out-of-fold."""
    order = np.sort(np.unique(p))
    notes = []

    # T_SCAM: el menor umbral con precisión >= objetivo (y al menos 10 estafas por encima).
    t_scam, best_prec = None, (0.0, 1.0)
    for t in order:
        sel = p >= t
        if sel.sum() < 10:
            break
        prec = y[sel].mean()
        if prec >= C.TARGET_SCAM_PRECISION:
            t_scam = float(t)
            break
        if prec > best_prec[0]:
            best_prec = (prec, float(t))
    if t_scam is None:
        t_scam = best_prec[1]
        notes.append(f"T_SCAM sin alcanzar {C.TARGET_SCAM_PRECISION:.0%} de precisión; "
                     f"se usa el más cercano ({best_prec[0]:.1%})")

    # T_SAFE: el mayor umbral que deja por debajo como máximo el 1 % de las estafas.
    scam_p = np.sort(p[y == 1])
    k = int(np.floor(C.MAX_SCAMS_BELOW_SAFE * len(scam_p)))  # estafas permitidas por debajo
    t_safe = float(scam_p[k]) if len(scam_p) else 0.0           # hay exactamente k por debajo
    t_safe = min(t_safe, t_scam)

    t_mid = 0.5 if t_safe < 0.5 < t_scam else (t_safe + t_scam) / 2
    if t_mid != 0.5:
        notes.append("T_MID fuera de [T_SAFE, T_SCAM]; se usa el punto medio")

    r = lambda v: round(float(v), 4)  # noqa: E731
    return {"scam": r(t_scam), "mid": r(t_mid), "safe": r(t_safe), "notes": notes}


def zone_report(p: np.ndarray, y: np.ndarray, th: dict) -> dict:
    """Cómo se reparten los mensajes de prueba en las zonas de la cascada."""
    zones = {
        "scam_zone":  p >= th["scam"],                          # sin IA: 🛑
        "high_gray":  (p >= th["mid"]) & (p < th["scam"]),     # IA, nunca baja a ✅
        "low_gray":   (p >= th["safe"]) & (p < th["mid"]),
        "safe_zone":  p < th["safe"],                           # sin internet: ✅
    }
    out = {}
    for name, m in zones.items():
        out[name] = {"total": int(m.sum()), "scams": int((y[m] == 1).sum()),
                     "legit": int((y[m] == 0).sum())}
    n_scam = max(int((y == 1).sum()), 1)
    n_legit = max(int((y == 0).sum()), 1)
    out["scams_called_safe_offline_pct"] = round(100 * out["safe_zone"]["scams"] / n_scam, 2)
    out["legit_called_scam_without_ai_pct"] = round(100 * out["scam_zone"]["legit"] / n_legit, 2)
    return out


def binary_metrics(y, p, thr=0.5) -> dict:
    pred = (p >= thr).astype(int)
    prec, rec, f1, _ = precision_recall_fscore_support(y, pred, average="binary", zero_division=0)
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    auc = roc_auc_score(y, p) if len(np.unique(y)) == 2 else None
    return {"n": int(len(y)), "scams": int(y.sum()), "precision": round(prec, 4),
            "recall": round(rec, 4), "f1": round(f1, 4),
            "roc_auc": None if auc is None else round(auc, 4),
            "confusion": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)}}


def train_scam(lang: str) -> dict:
    df = pd.read_csv(C.PROCESSED / f"{lang}.csv", encoding="utf-8")
    dev, test = df[df.split == "dev"], df[df.split == "test"]
    X, y = dev.text.to_numpy(), dev.label.to_numpy()

    print(f"\n=== Sonny-{lang.upper()}  dev={len(dev)}  test={len(test)}")
    cv_scores = {}
    for c in C.C_GRID:
        p = oof_proba(scam_pipeline(c), X, y)
        cv_scores[c] = (f1_score(y, (p >= 0.5).astype(int)), p)
        print(f"  C={c:<4} F1 (CV) = {cv_scores[c][0]:.4f}")
    # Parsimonia: el C más pequeño (más regularizado) a menos de C_TOLERANCE del mejor F1.
    # Evita perseguir diferencias de milésimas que son ruido de la validación cruzada.
    top = max(v[0] for v in cv_scores.values())
    best_c = min(c for c, v in cv_scores.items() if v[0] >= top - C.C_TOLERANCE)
    th = thresholds(cv_scores[best_c][1], y)
    print(f"  -> C={best_c}  umbrales={ {k: v for k, v in th.items() if k != 'notes'} }")
    for n in th["notes"]:
        print("  !", n)

    pipe = scam_pipeline(best_c).fit(X, y)
    joblib.dump(pipe, C.ARTIFACTS / f"{lang}.joblib")

    pt = pipe.predict_proba(test.text.to_numpy())[:, 1]
    yt = test.label.to_numpy()
    per_source = {}
    for src, g in test.assign(p=pt).groupby("source"):
        per_source[src] = binary_metrics(g.label.to_numpy(), g.p.to_numpy())
    per_subtype = {st: {"n": int(len(g)), "detected_at_0.5": int((g.p >= 0.5).sum()),
                        "below_T_SAFE": int((g.p < th["safe"]).sum())}
                   for st, g in test.assign(p=pt).groupby("subtype")}

    rep = {
        "lang": lang, "C": best_c,
        "cv_f1": {str(k): round(v[0], 4) for k, v in cv_scores.items()},
        "thresholds": th,
        "test@0.5": binary_metrics(yt, pt),
        "test_cascade_zones": zone_report(pt, yt, th),
        "test_per_source": per_source,
        "test_per_subtype": per_subtype,
        "dataset": {
            "dev": {"total": len(dev), "scams": int(dev.label.sum())},
            "test": {"total": len(test), "scams": int(test.label.sum())},
            "by_source": {s: {"total": int(len(g)), "scams": int(g.label.sum())}
                          for s, g in df.groupby("source")},
            "relabeled": int(df.relabeled.sum()),
        },
        "vocab_size": len(pipe.named_steps["tfidf"].vocabulary_),
    }
    m = rep["test@0.5"]
    z = rep["test_cascade_zones"]
    print(f"  TEST  precision={m['precision']}  recall={m['recall']}  f1={m['f1']}  "
          f"auc={m['roc_auc']}")
    print(f"        estafas que sin internet saldrían 'normal': "
          f"{z['scams_called_safe_offline_pct']}%  |  legítimos marcados estafa sin IA: "
          f"{z['legit_called_scam_without_ai_pct']}%")
    return rep


def train_lang() -> dict:
    frames = [pd.read_csv(C.PROCESSED / f"{l}.csv", encoding="utf-8") for l in ("en", "es")]
    df = pd.concat(frames, ignore_index=True)
    df["y"] = (df.lang == "es").astype(int)          # 1 = es, 0 = en
    dev, test = df[df.split == "dev"], df[df.split == "test"]

    pipe = lang_pipeline().fit(dev.text.to_numpy(), dev.y.to_numpy())
    joblib.dump(pipe, C.ARTIFACTS / "lang.joblib")

    p = pipe.predict_proba(test.text.to_numpy())[:, 1]
    conf = np.maximum(p, 1 - p)
    pred = (p >= 0.5).astype(int)
    yt = test.y.to_numpy()
    words = test.text.str.split().str.len().to_numpy()
    accepted = conf >= C.LANG_ACCEPT

    def acc(mask):
        return None if mask.sum() == 0 else round(float((pred[mask] == yt[mask]).mean()), 4)

    rep = {
        "test_n": int(len(test)),
        "accuracy": acc(np.ones_like(yt, dtype=bool)),
        "accuracy_short_le_8_words": acc(words <= 8),
        "accuracy_per_channel": {ch: acc((test.channel == ch).to_numpy())
                                 for ch in sorted(test.channel.unique())},
        "accept_threshold": C.LANG_ACCEPT,
        "share_accepted": round(float(accepted.mean()), 4),
        "accuracy_when_accepted": acc(accepted),
    }
    print(f"\n=== Detector de idioma  test={len(test)}  acc={rep['accuracy']}  "
          f"cortos={rep['accuracy_short_le_8_words']}  por canal={rep['accuracy_per_channel']}")
    return rep


def write_markdown(report: dict) -> None:
    L = ["# Métricas de los modelos de Sonny", "",
         "Generado por `03_train.py`. Conjunto de **prueba** (15 %, separado antes de entrenar).", ""]
    for lang in ("en", "es"):
        r = report[lang]
        m, z, th = r["test@0.5"], r["test_cascade_zones"], r["thresholds"]
        L += [f"## Sonny-{lang.upper()}", "",
              f"- Datos: {r['dataset']['dev']['total'] + r['dataset']['test']['total']} mensajes "
              f"({r['dataset']['dev']['scams'] + r['dataset']['test']['scams']} estafa/spam). "
              f"Por fuente: " + ", ".join(f"`{s}` {v['total']} ({v['scams']} estafa)"
                                          for s, v in r["dataset"]["by_source"].items()),
              f"- C = {r['C']} · vocabulario = {r['vocab_size']} n-gramas",
              f"- Umbrales: T_SCAM = {th['scam']}, T_MID = {th['mid']}, T_SAFE = {th['safe']}"]
        L += [f"  - ⚠️ {n}" for n in th["notes"]]
        L += ["", "| Métrica (umbral 0,5) | Valor |", "|---|---|",
              f"| Precisión | {m['precision']:.1%} |", f"| Recall (estafas detectadas) | {m['recall']:.1%} |",
              f"| F1 | {m['f1']:.3f} |", f"| ROC-AUC | {m['roc_auc']:.3f} |",
              f"| Matriz (tn, fp, fn, tp) | {m['confusion']['tn']}, {m['confusion']['fp']}, "
              f"{m['confusion']['fn']}, {m['confusion']['tp']} |", "",
              "| Zona de la cascada | Mensajes | Estafas | Legítimos |", "|---|---|---|---|"]
        for k, label in [("scam_zone", "🛑 p ≥ T_SCAM (no se envía a la IA)"),
                         ("high_gray", "⚠️ T_MID ≤ p < T_SCAM"),
                         ("low_gray", "⚠️ T_SAFE ≤ p < T_MID"),
                         ("safe_zone", "✅ p < T_SAFE")]:
            L.append(f"| {label} | {z[k]['total']} | {z[k]['scams']} | {z[k]['legit']} |")
        L += ["", f"- Estafas que **sin internet** saldrían como \"parece normal\": "
                  f"**{z['scams_called_safe_offline_pct']} %**",
              f"- Legítimos marcados como estafa sin consultar a la IA: "
              f"**{z['legit_called_scam_without_ai_pct']} %**", "",
              "| Fuente | n | Precisión | Recall | F1 |", "|---|---|---|---|---|"]
        for s, v in r["test_per_source"].items():
            L.append(f"| `{s}` | {v['n']} | {v['precision']:.1%} | {v['recall']:.1%} | {v['f1']:.3f} |")
        L += ["", "| Subtipo | n | Detectados (p ≥ 0,5) | Por debajo de T_SAFE |", "|---|---|---|---|"]
        for s, v in r["test_per_subtype"].items():
            L.append(f"| {s} | {v['n']} | {v['detected_at_0.5']} | {v['below_T_SAFE']} |")
        L.append("")
    g = report["lang_detector"]
    L += ["## Detector de idioma", "",
          f"- Exactitud: {g['accuracy']:.1%} · mensajes de ≤ 8 palabras: "
          f"{g['accuracy_short_le_8_words']:.1%}",
          f"- Por canal: " + ", ".join(f"{k} {v:.1%}" for k, v in g["accuracy_per_channel"].items()),
          f"- Con confianza ≥ {g['accept_threshold']}: {g['share_accepted']:.1%} de los mensajes, "
          f"exactitud {g['accuracy_when_accepted']:.1%}", ""]
    (C.REPORTS / "metrics.md").write_text("\n".join(L), encoding="utf-8")


def main() -> None:
    C.ARTIFACTS.mkdir(exist_ok=True)
    C.REPORTS.mkdir(exist_ok=True)
    report = {"en": train_scam("en"), "es": train_scam("es"), "lang_detector": train_lang()}
    (C.REPORTS / "metrics.json").write_text(json.dumps(report, indent=2, ensure_ascii=False),
                                            encoding="utf-8")
    write_markdown(report)
    print(f"\nInformes en {C.REPORTS}")


if __name__ == "__main__":
    main()

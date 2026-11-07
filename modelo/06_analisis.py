"""Análisis completo de los modelos de Sonny -> reports/analisis.md + reports/figuras/

Pruebas que ejecuta (por idioma):
   1. Datos: tamaño, clases, fuentes, longitud.
   2. Métricas en prueba con intervalos de confianza del 95 % (bootstrap).
   3. Tabla de umbrales (precisión / recall / falsos positivos).
   4. Calibración: ¿la probabilidad dice la verdad? (Brier, fiabilidad).
   5. Comparación con alternativas (siempre legítimo, palabras clave,
      TF-IDF de palabras, Naive Bayes, Sonny).
   6. Curva de aprendizaje: ¿más datos ayudarían?
   7. Generalización entre fuentes (entrenar con una, probar con otra).
   8. Cruce de idiomas (modelo EN con mensajes ES y al revés).
   9. Robustez: mayúsculas, tildes, errores de tipeo, otro enlace, emojis,
      ofuscación, mensajes recortados...
  10. Análisis de errores (falsos negativos y positivos más graves).
  11. Explicabilidad: n-gramas que más pesan y por qué decide cada mensaje.
  12. Detector de idioma: por longitud y con mensajes mezclados.
  13. Simulación de la cascada (qué se queda en el celular, qué va a la IA).
  14. Batería realista (consideraciones.md 11.3).
  15. Velocidad y tamaño en JavaScript (node js/bench.ts).

Uso:  python 06_analisis.py      (unos minutos; requiere haber ejecutado 02-04)
"""

from __future__ import annotations

import json
import random
import re
import subprocess
import time
import unicodedata
from importlib import import_module

import joblib
import matplotlib
import numpy as np
import pandas as pd

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from sklearn.calibration import calibration_curve  # noqa: E402
from sklearn.feature_extraction.text import TfidfVectorizer  # noqa: E402
from sklearn.linear_model import LogisticRegression  # noqa: E402
from sklearn.metrics import (brier_score_loss, confusion_matrix, f1_score,  # noqa: E402
                             precision_recall_curve, precision_score, recall_score,
                             roc_auc_score, roc_curve)
from sklearn.naive_bayes import ComplementNB  # noqa: E402
from sklearn.pipeline import Pipeline  # noqa: E402

import config as C  # noqa: E402
from preprocess import DOM_RE, URL_RE, preprocess  # noqa: E402

train_mod = import_module("03_train")
FIG = C.REPORTS / "figuras"
LANGS = ("en", "es")
NAME = {"en": "Sonny-EN", "es": "Sonny-ES"}
BEST_C = 8

# Paleta validada (scripts/validate_palette.js): legítimo = slot 1, estafa = slot 2.
INK, INK2, GRID, SURF, GRAY = "#0b0b0b", "#52514e", "#e8e7e3", "#fcfcfb", "#b5b3ad"
LEGIT, SCAM = "#2a78d6", "#eb6834"

plt.rcParams.update({
    "figure.facecolor": SURF, "axes.facecolor": SURF, "savefig.facecolor": SURF,
    "axes.edgecolor": GRID, "axes.labelcolor": INK2, "xtick.color": INK2, "ytick.color": INK2,
    "axes.grid": True, "grid.color": GRID, "grid.linewidth": 0.8, "axes.axisbelow": True,
    "axes.spines.top": False, "axes.spines.right": False, "font.size": 10,
    "axes.titlesize": 11, "axes.titleweight": "bold", "axes.titlecolor": INK,
    "legend.frameon": False, "lines.linewidth": 2,
})


# ------------------------------------------------------------------ utilidades
def load(lang):
    df = pd.read_csv(C.PROCESSED / f"{lang}.csv", encoding="utf-8")
    return df, df[df.split == "dev"].reset_index(drop=True), df[df.split == "test"].reset_index(drop=True)


def model_json(lang):
    return json.loads((C.EXPORTS / f"{lang}.sonny").read_text(encoding="utf-8"))


def pct(x, d=1):
    return "—" if x is None else f"{100 * x:.{d}f} %"


def short(t, n=90):
    t = "".join(c for c in str(t) if unicodedata.category(c) != "Cf")
    t = re.sub(r"\s+", " ", t).strip()
    return (t[: n - 1] + "…") if len(t) > n else t


def md_escape(t):
    return t.replace("|", "\\|")


def explain(model: dict, raw: str, k: int = 4):
    """Puntuación + n-gramas que más empujan hacia estafa y hacia legítimo."""
    lo, hi = model["ngram_range"]
    counts: dict[str, int] = {}
    for word in preprocess(raw).split(" "):
        if not word:
            continue
        w = " " + word + " "
        for n in range(lo, hi + 1):
            off, grams = 0, [w[0:n]]
            while off + n < len(w):
                off += 1
                grams.append(w[off:off + n])
            for g in grams:
                if g in model["vocab"]:
                    counts[g] = counts.get(g, 0) + 1
            if off == 0:
                break
    vals = {g: (1 + np.log(c)) * model["vocab"][g][0] for g, c in counts.items()}
    norm = np.sqrt(sum(v * v for v in vals.values())) or 1.0
    contrib = {g: v / norm * model["vocab"][g][1] for g, v in vals.items()}
    z = model["intercept"] + sum(contrib.values())
    p = 1 / (1 + np.exp(-z))
    order = sorted(contrib.items(), key=lambda kv: kv[1])
    return p, order[::-1][:k], order[:k]


def gram(g):
    return "`" + g.replace(" ", "␣") + "`"


def offline_verdict(p, th):
    return np.where(p >= th["scam"], "scam", np.where(p >= th["safe"], "suspicious", "safe"))


def metrics(y, p, thr=0.5):
    pred = (p >= thr).astype(int)
    return {"precision": precision_score(y, pred, zero_division=0),
            "recall": recall_score(y, pred, zero_division=0),
            "f1": f1_score(y, pred, zero_division=0),
            "auc": roc_auc_score(y, p) if len(np.unique(y)) == 2 else None}


def sonny_pipe(c=BEST_C):
    return train_mod.scam_pipeline(c)


# ------------------------------------------------------------------ 1. datos
def data_summary(lang):
    df, dev, test = load(lang)
    df["words"] = df.text.str.split().str.len()
    by = df.groupby("source").agg(total=("label", "size"), scams=("label", "sum"),
                                  words=("words", "median"), channel=("channel", "first"))
    return {"total": len(df), "scams": int(df.label.sum()), "dev": len(dev), "test": len(test),
            "by_source": {s: {k: (int(v) if k != "channel" else v) for k, v in r.items()}
                          for s, r in by.iterrows()},
            "relabeled": int(df.relabeled.sum())}


# ------------------------------------------------------------------ 2. bootstrap
def bootstrap(y, p, n=1000, seed=C.SEED):
    rng = np.random.default_rng(seed)
    out = {k: [] for k in ("precision", "recall", "f1", "auc")}
    for _ in range(n):
        idx = rng.integers(0, len(y), len(y))
        if len(np.unique(y[idx])) < 2:
            continue
        for k, v in metrics(y[idx], p[idx]).items():
            out[k].append(v)
    point = metrics(y, p)
    return {k: {"value": point[k], "lo": float(np.percentile(v, 2.5)),
                "hi": float(np.percentile(v, 97.5))} for k, v in out.items()}


# ------------------------------------------------------------------ 3. umbrales
def threshold_table(y, p, th):
    rows = []
    cands = sorted({0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9,
                    th["safe"], th["mid"], th["scam"]})
    for t in cands:
        pred = p >= t
        tag = [n for n, v in (("T_SAFE", th["safe"]), ("T_MID", th["mid"]), ("T_SCAM", th["scam"]))
               if abs(v - t) < 1e-9]
        rows.append({"t": t, "tag": "/".join(tag),
                     "precision": float(y[pred].mean()) if pred.any() else None,
                     "recall": float(pred[y == 1].mean()),
                     "fpr": float(pred[y == 0].mean())})
    return rows


# ------------------------------------------------------------------ 5. alternativas
KEYWORDS = {
    "en": ["free", "win", "won", "winner", "prize", "claim", "urgent", "verify", "account",
           "click", "cash", "txt", "reply", "password", "bank", "offer", "call now", "congrat"],
    "es": ["gana", "gratis", "premio", "urgente", "verifica", "cuenta", "clic", "banco",
           "contrasena", "clave", "oferta", "descuento", "dinero", "bloquead", "felicidades",
           "reclama", "exclusiv", "promocion"],
}


def keyword_scores(texts, lang):
    kws = KEYWORDS[lang]
    return np.array([sum(k in preprocess(t) for k in kws) for t in texts], dtype=float)


def baselines(lang):
    _, dev, test = load(lang)
    X, y, Xt, yt = dev.text, dev.label.to_numpy(), test.text, test.label.to_numpy()
    res = {}
    res["Siempre \"legítimo\""] = {**metrics(yt, np.zeros(len(yt))), "auc": 0.5}
    ks = keyword_scores(Xt, lang)
    m = metrics(yt, (ks >= 1).astype(float))
    m["auc"] = roc_auc_score(yt, ks)
    res["Lista de palabras clave"] = m
    word = Pipeline([("tfidf", TfidfVectorizer(preprocessor=preprocess, lowercase=False,
                                               ngram_range=(1, 2), sublinear_tf=True, min_df=2)),
                     ("clf", LogisticRegression(class_weight="balanced", max_iter=2000, C=BEST_C))])
    res["TF-IDF de palabras + regresión logística"] = metrics(yt, word.fit(X, y).predict_proba(Xt)[:, 1])
    nb = Pipeline([("tfidf", TfidfVectorizer(preprocessor=preprocess, lowercase=False, **C.SCAM_TFIDF)),
                   ("clf", ComplementNB())])
    res["N-gramas de caracteres + Naive Bayes"] = metrics(yt, nb.fit(X, y).predict_proba(Xt)[:, 1])
    pipe = joblib.load(C.ARTIFACTS / f"{lang}.joblib")
    res["**Sonny** (n-gramas de caracteres + regresión logística)"] = metrics(
        yt, pipe.predict_proba(Xt)[:, 1])
    return res


# ------------------------------------------------------------------ 6. aprendizaje
def learning_curve(lang, fracs=(0.1, 0.25, 0.5, 0.75, 1.0), seeds=(1, 2, 3)):
    _, dev, test = load(lang)
    out = []
    for f in fracs:
        f1s, aucs, recs = [], [], []
        for s in seeds if f < 1 else (1,):
            sub = dev.groupby("label", group_keys=False).sample(frac=f, random_state=s) if f < 1 else dev
            pt = sonny_pipe().fit(sub.text, sub.label).predict_proba(test.text)[:, 1]
            m = metrics(test.label.to_numpy(), pt)
            f1s.append(m["f1"]); aucs.append(m["auc"]); recs.append(m["recall"])
        out.append({"frac": f, "n": int(round(len(dev) * f)), "f1": float(np.mean(f1s)),
                    "f1_sd": float(np.std(f1s)), "auc": float(np.mean(aucs)),
                    "recall": float(np.mean(recs))})
    return out


# ------------------------------------------------------------------ 7. fuentes
def cross_source(lang):
    df, dev, test = load(lang)
    sources = sorted(df.source.unique())
    rows = []
    for a in sources:
        tr = dev[dev.source == a]
        pipe = sonny_pipe().fit(tr.text, tr.label)
        for b in sources:
            ev = test[test.source == a] if a == b else df[df.source == b]
            m = metrics(ev.label.to_numpy(), pipe.predict_proba(ev.text)[:, 1])
            rows.append({"train": a, "test": b, "n": len(ev), **m})
    return rows


# ------------------------------------------------------------------ 8. idiomas
def cross_lingual():
    res = {}
    for m_lang in LANGS:
        pipe = joblib.load(C.ARTIFACTS / f"{m_lang}.joblib")
        for d_lang in LANGS:
            _, _, test = load(d_lang)
            res[f"{m_lang}->{d_lang}"] = metrics(test.label.to_numpy(),
                                                 pipe.predict_proba(test.text)[:, 1])
    return res


# ------------------------------------------------------------------ 9. robustez
# Mismas expresiones que preprocess.py, sin distinguir mayúsculas.
URL_ANY = re.compile(URL_RE.pattern, re.I)
DOM_ANY = re.compile(DOM_RE.pattern, re.I | re.ASCII)


def other_link(t, rng):
    return DOM_ANY.sub("otro-sitio.xyz/abc", URL_ANY.sub("http://otro-sitio.xyz/abc", t))


def invisibles(t, rng):
    """Inserta un carácter invisible (U+200C) cada 3 letras, como hacen algunos estafadores."""
    return re.sub(r"(\w\w\w)", lambda m: m.group(1) + chr(0x200C), t)


def typos(t, rng):
    words = t.split(" ")
    for i, w in enumerate(words):
        if len(w) > 3 and rng.random() < 0.10:
            j = rng.randrange(len(w) - 1)
            words[i] = w[:j] + w[j + 1] + w[j] + w[j + 2:]
    return " ".join(words)


def strip_accents(t):
    return "".join(c for c in unicodedata.normalize("NFKD", t) if unicodedata.category(c) != "Mn")


LEET = str.maketrans({"o": "0", "O": "0", "e": "3", "E": "3", "a": "4", "A": "4", "i": "1", "I": "1"})

PERTURBATIONS = {
    "TODO EN MAYÚSCULAS": lambda t, r: t.upper(),
    "Sin tildes ni eñes": lambda t, r: strip_accents(t),
    "Errores de tipeo (1 de cada 10 palabras)": typos,
    "Espacios y saltos de línea extra": lambda t, r: t.replace(" ", "  \n "),
    "Emojis al final": lambda t, r: t + " 🙏😀👍",
    "Otro enlace (cambia el dominio)": other_link,
    "Caracteres invisibles insertados": invisibles,
    "Números cambiados": lambda t, r: re.sub(r"[0-9]", lambda m: str(r.randrange(10)), t),
    "Mensaje recortado a la mitad": lambda t, r: " ".join(t.split(" ")[: max(1, len(t.split(" ")) // 2)]),
    "Ofuscación l33t (o→0, e→3, a→4, i→1)": lambda t, r: t.translate(LEET),
}


def robustness(lang):
    _, _, test = load(lang)
    pipe = joblib.load(C.ARTIFACTS / f"{lang}.joblib")
    th = model_json(lang)["thresholds"]
    y = test.label.to_numpy()
    p0 = pipe.predict_proba(test.text)[:, 1]
    v0 = offline_verdict(p0, th)
    rows = []
    for name, fn in PERTURBATIONS.items():
        rng = random.Random(C.SEED)
        texts = [fn(t, rng) for t in test.text]
        changed = np.array([a != b for a, b in zip(texts, test.text)])
        p1 = pipe.predict_proba(texts)[:, 1]
        v1 = offline_verdict(p1, th)
        scam_safe_0 = ((v0 == "safe") & (y == 1)).sum()
        scam_safe_1 = ((v1 == "safe") & (y == 1)).sum()
        rows.append({"name": name, "affected": int(changed.sum()),
                     "mean_abs_dp": float(np.abs(p1 - p0)[changed].mean()) if changed.any() else 0.0,
                     "verdict_changed": float((v1 != v0)[changed].mean()) if changed.any() else 0.0,
                     "recall_before": float((p0[y == 1] >= 0.5).mean()),
                     "recall_after": float((p1[y == 1] >= 0.5).mean()),
                     "scams_safe_before": int(scam_safe_0), "scams_safe_after": int(scam_safe_1)})
    return rows


def typos30(t, rng):
    words = t.split(" ")
    for i, w in enumerate(words):
        if len(w) > 3 and rng.random() < 0.30:
            j = rng.randrange(len(w) - 1)
            words[i] = w[:j] + w[j + 1] + w[j] + w[j + 2:]
    return " ".join(words)


def word_vs_char(lang):
    """¿Por qué n-gramas de caracteres y no palabras? Recall bajo cada transformación."""
    _, dev, test = load(lang)
    y = test.label.to_numpy()
    word = Pipeline([("tfidf", TfidfVectorizer(preprocessor=preprocess, lowercase=False,
                                               ngram_range=(1, 2), sublinear_tf=True, min_df=2)),
                     ("clf", LogisticRegression(class_weight="balanced", max_iter=2000, C=BEST_C))])
    word.fit(dev.text, dev.label)
    char = joblib.load(C.ARTIFACTS / f"{lang}.joblib")
    rows = []
    for name, fn in [("Sin cambios", lambda t, r: t), ("Tipeo en 10 % de las palabras", typos),
                     ("Tipeo en 30 % de las palabras", typos30),
                     ("Ofuscación l33t", lambda t, r: t.translate(LEET))]:
        rng = random.Random(C.SEED)
        X = [fn(t, rng) for t in test.text]
        rows.append({"name": name,
                     "word": float((word.predict_proba(X)[:, 1][y == 1] >= 0.5).mean()),
                     "char": float((char.predict_proba(X)[:, 1][y == 1] >= 0.5).mean())})
    return rows


# ------------------------------------------------------------------ 10. errores
def errors(lang, k=6):
    _, _, test = load(lang)
    pipe = joblib.load(C.ARTIFACTS / f"{lang}.joblib")
    th = model_json(lang)["thresholds"]
    t = test.assign(p=pipe.predict_proba(test.text)[:, 1])
    fn = t[(t.label == 1)].nsmallest(k, "p")
    fp = t[(t.label == 0)].nlargest(k, "p")
    as_rows = lambda d: [{"text": short(r.text, 110), "p": float(r.p), "source": r.source,  # noqa: E731
                          "subtype": r.subtype, "verdict": offline_verdict(np.array([r.p]), th)[0]}
                         for r in d.itertuples()]
    return {"fn": as_rows(fn), "fp": as_rows(fp),
            "n_fn": int(((t.label == 1) & (t.p < 0.5)).sum()),
            "n_fp": int(((t.label == 0) & (t.p >= 0.5)).sum())}


# ------------------------------------------------------------------ 11. explicabilidad
def top_ngrams(lang, k=15):
    pipe = joblib.load(C.ARTIFACTS / f"{lang}.joblib")
    vocab = pipe.named_steps["tfidf"].vocabulary_
    coef = pipe.named_steps["clf"].coef_[0]
    inv = {i: g for g, i in vocab.items()}
    order = np.argsort(coef)
    return ([(inv[i], float(coef[i])) for i in order[::-1][:k]],
            [(inv[i], float(coef[i])) for i in order[:k]])


# ------------------------------------------------------------------ 12. idioma
MIXED = [
    ("ok", None), ("gracias", "es"), ("thanks", "en"), ("hola", "es"), ("hi", "en"),
    ("Ok, nos vemos mañana", "es"), ("See you tomorrow!", "en"),
    ("Tu cuenta de Netflix ha sido suspendida", "es"), ("Your Netflix account is on hold", "en"),
    ("Hola, your package is waiting", None), ("Call me cuando puedas", None),
    ("Su código OTP es 4821", "es"), ("Your OTP is 4821", "en"), ("BBVA", None), ("😀😀", None),
]


def lang_analysis():
    pipe = joblib.load(C.ARTIFACTS / "lang.joblib")
    frames = [load(l)[2] for l in LANGS]
    test = pd.concat(frames, ignore_index=True)
    y = (test.lang == "es").astype(int).to_numpy()
    p = pipe.predict_proba(test.text)[:, 1]
    pred = (p >= 0.5).astype(int)
    conf = np.maximum(p, 1 - p)
    words = test.text.str.split().str.len().to_numpy()
    buckets = [("1–3 palabras", words <= 3), ("4–8 palabras", (words > 3) & (words <= 8)),
               ("9–20 palabras", (words > 8) & (words <= 20)), ("más de 20", words > 20)]
    by_len = [{"bucket": b, "n": int(m.sum()),
               "acc": float((pred[m] == y[m]).mean()) if m.any() else None,
               "accepted": float((conf[m] >= C.LANG_ACCEPT).mean()) if m.any() else None}
              for b, m in buckets]
    cm = confusion_matrix(y, pred, labels=[0, 1]).tolist()
    mixed = []
    for text, expect in MIXED:
        pe = float(pipe.predict_proba([text])[0, 1])
        c = max(pe, 1 - pe)
        got = ("es" if pe >= 0.5 else "en") if c >= C.LANG_ACCEPT else None
        mixed.append({"text": text, "p_es": pe, "decision": got or "principal", "expected": expect})
    return {"cm": cm, "by_len": by_len, "mixed": mixed, "n": len(test)}


# ------------------------------------------------------------------ 13. cascada
def cascade(lang):
    _, _, test = load(lang)
    pipe = joblib.load(C.ARTIFACTS / f"{lang}.joblib")
    th = model_json(lang)["thresholds"]
    y = test.label.to_numpy()
    p = pipe.predict_proba(test.text)[:, 1]
    v = offline_verdict(p, th)
    table = {cls: {ver: int(((y == ci) & (v == ver)).sum()) for ver in ("scam", "suspicious", "safe")}
             for ci, cls in ((1, "scam"), (0, "legit"))}
    return {"kept_on_device": float((p >= th["scam"]).mean()), "sent_to_ai": float((p < th["scam"]).mean()),
            "offline": table, "n": len(y)}


# ------------------------------------------------------------------ 14. batería
def battery():
    bat = pd.read_csv(C.MANUAL / "bateria.csv", encoding="utf-8")
    rows = []
    for r in bat.itertuples():
        m = model_json(r.lang)
        p, up, down = explain(m, r.text, 3)
        v = offline_verdict(np.array([p]), m["thresholds"])[0]
        ok = (r.label == 1 and v != "safe") or (r.label == 0 and v != "scam")
        rows.append({"lang": r.lang, "tipo": r.tipo, "label": int(r.label), "text": r.text,
                     "p": float(p), "verdict": v, "ok": bool(ok),
                     "up": [g for g, _ in up], "down": [g for g, _ in down]})
    return rows


# ------------------------------------------------------------------ 15. JS
def js_bench():
    try:
        out = subprocess.run(["node", "js/bench.ts"], cwd=C.ROOT, capture_output=True,
                             text=True, encoding="utf-8", timeout=300)
        return json.loads(out.stdout.strip().splitlines()[-1])
    except Exception as e:  # noqa: BLE001
        return {"error": str(e)}


# ------------------------------------------------------------------ figuras
def save(fig, name):
    FIG.mkdir(parents=True, exist_ok=True)
    fig.savefig(FIG / name, dpi=150, bbox_inches="tight")
    plt.close(fig)


def fig_distribution(R):
    fig, axes = plt.subplots(1, 2, figsize=(11, 3.8))
    bins = np.linspace(0, 1, 41)
    for ax, lang in zip(axes, LANGS):
        _, _, test = load(lang)
        p = joblib.load(C.ARTIFACTS / f"{lang}.joblib").predict_proba(test.text)[:, 1]
        y = test.label.to_numpy()
        th = model_json(lang)["thresholds"]
        ax.axvspan(0, th["safe"], color=LEGIT, alpha=0.06, lw=0)
        ax.axvspan(th["scam"], 1, color=SCAM, alpha=0.08, lw=0)
        ax.hist(p[y == 0], bins=bins, color=LEGIT, label="Legítimo", edgecolor=SURF, linewidth=1)
        ax.hist(p[y == 1], bins=bins, color=SCAM, label="Estafa/spam", edgecolor=SURF, linewidth=1,
                alpha=0.9)
        ax.set_yscale("log")
        top = ax.get_ylim()[1]
        for i, (key, lab) in enumerate((("safe", "T_SAFE"), ("mid", "T_MID"), ("scam", "T_SCAM"))):
            ax.axvline(th[key], color=INK2, lw=1, ls="--")
            # Alturas escalonadas para que las etiquetas no se pisen.
            ax.text(th[key], top * (0.9 / (3 ** i)), f" {lab} {th[key]:.2f}", color=INK2, fontsize=8,
                    va="top")
        ax.set_title(f"{NAME[lang]}: puntuación en el conjunto de prueba")
        ax.set_xlabel("Probabilidad de estafa (p)")
        ax.set_ylabel("Mensajes (escala log)")
        ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.18), ncol=2)
    save(fig, "distribucion_puntuaciones.png")


def fig_roc_pr():
    fig, axes = plt.subplots(2, 2, figsize=(10, 8))
    for col, lang in enumerate(LANGS):
        _, _, test = load(lang)
        y = test.label.to_numpy()
        p = joblib.load(C.ARTIFACTS / f"{lang}.joblib").predict_proba(test.text)[:, 1]
        fpr, tpr, _ = roc_curve(y, p)
        ax = axes[0, col]
        ax.plot([0, 1], [0, 1], color=GRAY, lw=1, ls="--")
        ax.plot(fpr, tpr, color=LEGIT)
        ax.set_title(f"{NAME[lang]}: curva ROC (AUC {roc_auc_score(y, p):.3f})")
        ax.set_xlabel("Legítimos marcados como estafa"); ax.set_ylabel("Estafas detectadas")
        prec, rec, _ = precision_recall_curve(y, p)
        ax = axes[1, col]
        ax.plot(rec, prec, color=LEGIT)
        ax.axhline(y.mean(), color=GRAY, lw=1, ls="--")
        ax.text(0.02, y.mean() + 0.02, "azar", color=INK2, fontsize=8)
        ax.set_ylim(0, 1.02)
        ax.set_title(f"{NAME[lang]}: precisión frente a recall")
        ax.set_xlabel("Recall (estafas detectadas)"); ax.set_ylabel("Precisión")
    fig.tight_layout()
    save(fig, "roc_pr.png")


def fig_learning(R):
    fig, axes = plt.subplots(1, 2, figsize=(10, 3.6), sharey=True)
    for ax, lang in zip(axes, LANGS):
        lc = R[lang]["learning"]
        n = [r["n"] for r in lc]; f1 = [r["f1"] for r in lc]; sd = [r["f1_sd"] for r in lc]
        ax.fill_between(n, np.array(f1) - sd, np.array(f1) + sd, color=LEGIT, alpha=0.15, lw=0)
        ax.plot(n, f1, color=LEGIT, marker="o", markersize=6)
        ax.annotate(f"{f1[-1]:.3f}", (n[-1], f1[-1]), textcoords="offset points", xytext=(-10, 8),
                    color=INK, fontsize=9)
        ax.set_title(f"{NAME[lang]}: F1 según cantidad de datos")
        ax.set_xlabel("Mensajes de entrenamiento"); ax.set_ylabel("F1 en prueba")
    save(fig, "curva_aprendizaje.png")


def fig_calibration():
    fig, axes = plt.subplots(1, 2, figsize=(10, 4), sharey=True)
    for ax, lang in zip(axes, LANGS):
        _, _, test = load(lang)
        y = test.label.to_numpy()
        p = joblib.load(C.ARTIFACTS / f"{lang}.joblib").predict_proba(test.text)[:, 1]
        frac, mean = calibration_curve(y, p, n_bins=10, strategy="quantile")
        ax.plot([0, 1], [0, 1], color=GRAY, lw=1, ls="--")
        ax.text(0.62, 0.55, "calibración perfecta", color=INK2, fontsize=8, rotation=38)
        ax.plot(mean, frac, color=LEGIT, marker="o", markersize=6)
        ax.set_title(f"{NAME[lang]}: ¿la probabilidad dice la verdad?")
        ax.set_xlabel("Probabilidad que da el modelo"); ax.set_ylabel("Proporción real de estafas")
    save(fig, "calibracion.png")


def fig_baselines(R):
    fig, axes = plt.subplots(1, 2, figsize=(11, 3.6), sharex=True)
    for ax, lang in zip(axes, LANGS):
        items = list(R[lang]["baselines"].items())
        names = [n.replace("**", "") for n, _ in items]
        f1 = [m["f1"] for _, m in items]
        colors = [LEGIT if "Sonny" in n else GRAY for n in names]
        ax.barh(range(len(f1)), f1, color=colors, height=0.6)
        for i, v in enumerate(f1):
            ax.text(v + 0.01, i, f"{v:.3f}", va="center", color=INK, fontsize=9)
        ax.set_yticks(range(len(f1)), [n.replace(" + ", "\n+ ") for n in names], fontsize=8)
        ax.set_xlim(0, 1.12); ax.grid(axis="y", visible=False)
        ax.set_title(f"{NAME[lang]}: F1 en prueba frente a alternativas")
        ax.invert_yaxis()
    fig.tight_layout()
    save(fig, "comparacion_alternativas.png")


def fig_ngrams(R):
    fig, axes = plt.subplots(1, 2, figsize=(11, 5.5))
    for ax, lang in zip(axes, LANGS):
        up, down = R[lang]["ngrams"]
        items = [(g, c) for g, c in up[:10]] + [(g, c) for g, c in down[:10]][::-1]
        items = sorted(items, key=lambda kv: kv[1])
        vals = [c for _, c in items]
        ax.barh(range(len(items)), vals, color=[SCAM if v > 0 else LEGIT for v in vals], height=0.7)
        ax.set_yticks(range(len(items)), ["'" + g.replace(" ", "␣") + "'" for g, _ in items],
                      fontsize=8, family="monospace")
        ax.axvline(0, color=INK2, lw=0.8)
        ax.grid(axis="y", visible=False)
        ax.set_title(f"{NAME[lang]}: n-gramas con más peso")
        ax.set_xlabel("← legítimo        peso (coeficiente)        estafa →")
    save(fig, "ngramas_peso.png")


def fig_robustness(R):
    fig, axes = plt.subplots(1, 2, figsize=(11, 4.2), sharex=True)
    for ax, lang in zip(axes, LANGS):
        rows = R[lang]["robustness"]
        vals = [r["verdict_changed"] for r in rows]
        ax.barh(range(len(rows)), vals, color=LEGIT, height=0.6)
        for i, v in enumerate(vals):
            ax.text(v + 0.005, i, pct(v), va="center", fontsize=8, color=INK)
        ax.set_yticks(range(len(rows)), [r["name"] for r in rows], fontsize=8)
        ax.invert_yaxis(); ax.grid(axis="y", visible=False)
        ax.set_xlim(0, max(0.35, max(vals) * 1.25))
        ax.xaxis.set_major_formatter(matplotlib.ticker.PercentFormatter(1.0))
        ax.set_title(f"{NAME[lang]}: veredictos que cambian")
    fig.tight_layout()
    save(fig, "robustez.png")


# ------------------------------------------------------------------ informe
def write_report(R, elapsed):
    L = ["# Análisis completo de los modelos de Sonny", "",
         f"> Generado automáticamente por `06_analisis.py` ({time.strftime('%Y-%m-%d %H:%M')}, "
         f"{elapsed:.0f} s). Interpretación y guion de demostración: "
         "[`../ANALISIS_MODELO.md`](../ANALISIS_MODELO.md).", ""]

    L += ["## 1. Datos", ""]
    for lang in LANGS:
        d = R[lang]["data"]
        L += [f"**{NAME[lang]}:** {d['total']} mensajes ({d['scams']} estafa/spam), "
              f"{d['dev']} para desarrollo y {d['test']} para prueba. Etiquetas corregidas: {d['relabeled']}.", "",
              "| Fuente | Canal | Mensajes | Estafa/spam | Mediana de palabras |", "|---|---|---|---|---|"]
        for s, v in d["by_source"].items():
            L.append(f"| `{s}` | {v['channel']} | {v['total']} | {v['scams']} | {v['words']} |")
        L.append("")

    L += ["## 2. Métricas en prueba con intervalo de confianza del 95 %", "",
          "Bootstrap de 1.000 remuestreos del conjunto de prueba, umbral 0,5.", "",
          "| Modelo | Precisión | Recall | F1 | ROC-AUC |", "|---|---|---|---|---|"]
    for lang in LANGS:
        b = R[lang]["bootstrap"]
        cell = lambda k: f"{b[k]['value']:.3f} ({b[k]['lo']:.3f}–{b[k]['hi']:.3f})"  # noqa: E731
        L.append(f"| {NAME[lang]} | {cell('precision')} | {cell('recall')} | {cell('f1')} | {cell('auc')} |")
    L += ["", "![Distribución de puntuaciones](figuras/distribucion_puntuaciones.png)", "",
          "![ROC y precisión-recall](figuras/roc_pr.png)", ""]

    L += ["## 3. Umbrales", ""]
    for lang in LANGS:
        L += [f"**{NAME[lang]}**", "", "| Umbral | | Precisión | Recall | Legítimos marcados |",
              "|---|---|---|---|---|"]
        for r in R[lang]["thresholds"]:
            L.append(f"| {r['t']:.3f} | {r['tag']} | {pct(r['precision'])} | {pct(r['recall'])} | {pct(r['fpr'])} |")
        L.append("")

    L += ["## 4. Calibración", "", "| Modelo | Brier (menor es mejor; azar ≈ 0,25) |", "|---|---|"]
    for lang in LANGS:
        L.append(f"| {NAME[lang]} | {R[lang]['brier']:.4f} |")
    L += ["", "![Calibración](figuras/calibracion.png)", ""]

    L += ["## 5. Comparación con alternativas", ""]
    for lang in LANGS:
        L += [f"**{NAME[lang]}**", "", "| Método | Precisión | Recall | F1 | ROC-AUC |", "|---|---|---|---|---|"]
        for n, m in R[lang]["baselines"].items():
            auc = "—" if m["auc"] is None else f"{m['auc']:.3f}"
            L.append(f"| {n} | {pct(m['precision'])} | {pct(m['recall'])} | {m['f1']:.3f} | {auc} |")
        L.append("")
    L += ["![Comparación](figuras/comparacion_alternativas.png)", ""]

    L += ["## 6. Curva de aprendizaje", "",
          "Media de 3 submuestras estratificadas por tamaño; la banda es ± 1 desviación típica.", "",
          "| Modelo | Fracción | Mensajes | F1 | Recall | ROC-AUC |", "|---|---|---|---|---|---|"]
    for lang in LANGS:
        for r in R[lang]["learning"]:
            L.append(f"| {NAME[lang]} | {r['frac']:.0%} | {r['n']} | {r['f1']:.3f} ± {r['f1_sd']:.3f} | "
                     f"{pct(r['recall'])} | {r['auc']:.3f} |")
    L += ["", "![Curva de aprendizaje](figuras/curva_aprendizaje.png)", ""]

    L += ["## 7. Generalización entre fuentes", "",
          "Se entrena solo con una fuente y se prueba con otra que el modelo nunca vio.", "",
          "| Modelo | Entrena con | Prueba con | n | Precisión | Recall | F1 | ROC-AUC |",
          "|---|---|---|---|---|---|---|---|"]
    for lang in LANGS:
        for r in R[lang]["cross_source"]:
            L.append(f"| {NAME[lang]} | `{r['train']}` | `{r['test']}`{' (prueba)' if r['train'] == r['test'] else ''} | "
                     f"{r['n']} | {pct(r['precision'])} | {pct(r['recall'])} | {r['f1']:.3f} | {r['auc']:.3f} |")
    L.append("")

    L += ["## 8. Cruce de idiomas", "", "| Modelo → mensajes | Precisión | Recall | F1 | ROC-AUC |",
          "|---|---|---|---|---|"]
    for k, m in R["cross_lingual"].items():
        a, b = k.split("->")
        L.append(f"| {NAME[a]} → mensajes en {b.upper()} | {pct(m['precision'])} | {pct(m['recall'])} | "
                 f"{m['f1']:.3f} | {m['auc']:.3f} |")
    L.append("")

    L += ["## 9. Robustez", "",
          "Cada transformación se aplica a todos los mensajes de prueba. *Veredicto* = 🛑/⚠️/✅ sin internet.", ""]
    for lang in LANGS:
        L += [f"**{NAME[lang]}**", "",
              "| Transformación | Afectados | Cambio medio de p | Veredictos que cambian | Recall antes → después | Estafas ✅ antes → después |",
              "|---|---|---|---|---|---|"]
        for r in R[lang]["robustness"]:
            L.append(f"| {r['name']} | {r['affected']} | {r['mean_abs_dp']:.3f} | {pct(r['verdict_changed'])} | "
                     f"{pct(r['recall_before'])} → {pct(r['recall_after'])} | {r['scams_safe_before']} → {r['scams_safe_after']} |")
        L.append("")
    before = C.REPORTS / "invisibles_antes.json"
    if before.exists():
        b0 = json.loads(before.read_text(encoding="utf-8"))
        L += ["**Ataque con caracteres invisibles, antes y después del arreglo** (el preprocesado elimina "
              "ahora los caracteres Unicode `Cf`):", "",
              "| Modelo | Recall sin ataque | Con ataque, ANTES del arreglo | Con ataque, DESPUÉS |",
              "|---|---|---|---|"]
        for lang in LANGS:
            after = next(r for r in R[lang]["robustness"] if r["name"] == "Caracteres invisibles insertados")
            L.append(f"| {NAME[lang]} | {pct(b0[lang]['recall_before'])} | {pct(b0[lang]['recall_after'])} | "
                     f"{pct(after['recall_after'])} |")
        L.append("")
    L += ["![Robustez](figuras/robustez.png)", "",
          "**Palabras frente a caracteres** (recall de estafas, umbral 0,5): TF-IDF de palabras + regresión "
          "logística frente a Sonny (n-gramas de caracteres), con los mismos datos.", "",
          "| Modelo | Transformación | Palabras | Caracteres (Sonny) |", "|---|---|---|---|"]
    for lang in LANGS:
        for r in R[lang]["word_vs_char"]:
            L.append(f"| {NAME[lang]} | {r['name']} | {pct(r['word'])} | {pct(r['char'])} |")
    L.append("")

    L += ["## 10. Análisis de errores", ""]
    vmap = {"scam": "🛑", "suspicious": "⚠️", "safe": "✅"}
    for lang in LANGS:
        e = R[lang]["errors"]
        L += [f"**{NAME[lang]}**: {e['n_fn']} estafas no detectadas y {e['n_fp']} legítimos marcados (umbral 0,5).", "",
              "Estafas con la puntuación más baja:", "", "| p | Sin internet | Fuente | Mensaje |", "|---|---|---|---|"]
        L += [f"| {r['p']:.3f} | {vmap[r['verdict']]} | `{r['source']}`/{r['subtype']} | {md_escape(r['text'])} |" for r in e["fn"]]
        L += ["", "Legítimos con la puntuación más alta:", "", "| p | Sin internet | Fuente | Mensaje |", "|---|---|---|---|"]
        L += [f"| {r['p']:.3f} | {vmap[r['verdict']]} | `{r['source']}` | {md_escape(r['text'])} |" for r in e["fp"]]
        L.append("")

    L += ["## 11. Explicabilidad", "", "`␣` = límite de palabra.", "",
          "![N-gramas con más peso](figuras/ngramas_peso.png)", ""]
    for lang in LANGS:
        up, down = R[lang]["ngrams"]
        L += [f"**{NAME[lang]}**: hacia estafa: " + ", ".join(gram(g) for g, _ in up[:12]),
              "", "Hacia legítimo: " + ", ".join(gram(g) for g, _ in down[:12]), ""]

    la = R["lang"]
    L += ["## 12. Detector de idioma", "",
          f"Matriz de confusión (filas = real EN/ES, columnas = predicho EN/ES): `{la['cm']}` sobre {la['n']} mensajes.", "",
          "| Longitud | Mensajes | Exactitud | Con confianza ≥ 0,8 |", "|---|---|---|---|"]
    L += [f"| {b['bucket']} | {b['n']} | {pct(b['acc'])} | {pct(b['accepted'])} |" for b in la["by_len"]]
    L += ["", "Mensajes cortos o mezclados (*principal* = se usa el idioma del usuario):", "",
          "| Mensaje | p(es) | Decisión | Esperado |", "|---|---|---|---|"]
    L += [f"| {md_escape(m['text'])} | {m['p_es']:.2f} | {m['decision']} | {m['expected'] or 'cualquiera'} |"
          for m in la["mixed"]]
    L.append("")

    L += ["## 13. Simulación de la cascada (conjunto de prueba)", "",
          "| Modelo | Se quedan en el celular (🛑 sin IA) | Van a la IA (con internet) |", "|---|---|---|"]
    for lang in LANGS:
        c = R[lang]["cascade"]
        L.append(f"| {NAME[lang]} | {pct(c['kept_on_device'])} | {pct(c['sent_to_ai'])} |")
    L += ["", "Sin internet (filas = realidad, columnas = veredicto):", "",
          "| Modelo | Realidad | 🛑 Estafa | ⚠️ Dudoso | ✅ Parece normal |", "|---|---|---|---|---|"]
    for lang in LANGS:
        for cls, lab in (("scam", "Estafa/spam"), ("legit", "Legítimo")):
            t = R[lang]["cascade"]["offline"][cls]
            L.append(f"| {NAME[lang]} | {lab} | {t['scam']} | {t['suspicious']} | {t['safe']} |")
    L.append("")

    L += ["## 14. Batería realista (consideraciones.md 11.3)", "",
          "| Idioma | Tipo | Real | p | Sin internet | ¿Bien? | Lo que más empuja a estafa | Lo que más empuja a legítimo |",
          "|---|---|---|---|---|---|---|---|"]
    for r in R["battery"]:
        L.append(f"| {r['lang']} | {r['tipo']} | {'estafa' if r['label'] else 'legítimo'} | {r['p']:.3f} | "
                 f"{vmap[r['verdict']]} | {'✅' if r['ok'] else '❌'} | {', '.join(gram(g) for g in r['up'])} | "
                 f"{', '.join(gram(g) for g in r['down'])} |")
    ok = sum(r["ok"] for r in R["battery"])
    L += ["", f"**{ok}/{len(R['battery'])}** (estafa nunca ✅, legítimo nunca 🛑).", ""]

    b = R["js"]
    L += ["## 15. Velocidad y tamaño en JavaScript", ""]
    if "error" in b:
        L.append(f"No se pudo ejecutar `node js/bench.ts`: {b['error']}")
    else:
        L += [f"Node {b['node']}, {b['iterations']} análisis por modelo.", "",
              "| Archivo | Tamaño | Cargar (JSON.parse) | Por mensaje (mediana) | p99 |", "|---|---|---|---|---|"]
        for name, m in b["models"].items():
            L.append(f"| `{name}` | {m['mb']:.2f} MB | {m['load_ms']:.0f} ms | {m['median_ms']:.3f} ms | {m['p99_ms']:.3f} ms |")
    L.append("")
    (C.REPORTS / "analisis.md").write_text("\n".join(L), encoding="utf-8")


def main():
    t0 = time.time()
    R = {"cross_lingual": None}
    for lang in LANGS:
        print(f"== {NAME[lang]}")
        _, _, test = load(lang)
        y = test.label.to_numpy()
        p = joblib.load(C.ARTIFACTS / f"{lang}.joblib").predict_proba(test.text)[:, 1]
        th = model_json(lang)["thresholds"]
        R[lang] = {"data": data_summary(lang), "bootstrap": bootstrap(y, p),
                   "thresholds": threshold_table(y, p, th), "brier": float(brier_score_loss(y, p))}
        print("   alternativas…");     R[lang]["baselines"] = baselines(lang)
        print("   aprendizaje…");      R[lang]["learning"] = learning_curve(lang)
        print("   fuentes…");          R[lang]["cross_source"] = cross_source(lang)
        print("   robustez…");         R[lang]["robustness"] = robustness(lang)
        R[lang]["word_vs_char"] = word_vs_char(lang)
        R[lang]["errors"] = errors(lang)
        R[lang]["ngrams"] = top_ngrams(lang)
        R[lang]["cascade"] = cascade(lang)
    print("== idiomas, batería, JS")
    R["cross_lingual"] = cross_lingual()
    R["lang"] = lang_analysis()
    R["battery"] = battery()
    R["js"] = js_bench()
    print("== figuras")
    fig_distribution(R); fig_roc_pr(); fig_learning(R); fig_calibration()
    fig_baselines(R); fig_ngrams(R); fig_robustness(R)
    (C.REPORTS / "analisis.json").write_text(json.dumps(R, indent=1, ensure_ascii=False, default=float),
                                             encoding="utf-8")
    write_report(R, time.time() - t0)
    print(f"Listo en {time.time() - t0:.0f} s -> reports/analisis.md, reports/figuras/")


if __name__ == "__main__":
    main()

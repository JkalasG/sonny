"""Une, limpia y deduplica los datasets -> data/processed/{en,es}.csv

Columnas de salida:
  text       texto original (sin preprocesar)
  label      1 = estafa/spam, 0 = legítimo
  lang       en | es
  source     dataset de origen
  channel    sms | email | whatsapp
  subtype    etiqueta original más fina (ham, spam, smishing, phishing...)
  relabeled  1 si la etiqueta se corrigió con data/manual/relabel_es.csv
  split      dev (85 %, para validación cruzada) | test (15 %, solo al final)

Uso:  python 02_prepare.py
"""

from __future__ import annotations

import pandas as pd
from sklearn.model_selection import train_test_split

from config import MANUAL, PROCESSED, RAW, SEED, TEST_SIZE
from preprocess import preprocess

COLS = ["text", "label", "lang", "source", "channel", "subtype", "relabeled"]


def frame(text, label, lang, source, channel, subtype) -> pd.DataFrame:
    df = pd.DataFrame({"text": text, "label": label, "subtype": subtype})
    df["lang"], df["source"], df["channel"], df["relabeled"] = lang, source, channel, 0
    return df[COLS]


# ---------------------------------------------------------------- inglés
def load_uci() -> pd.DataFrame:
    df = pd.read_csv(RAW / "uci_sms" / "SMSSpamCollection", sep="\t", header=None,
                     names=["subtype", "text"], quoting=3, encoding="utf-8")
    return frame(df.text, (df.subtype == "spam").astype(int), "en", "uci_sms", "sms", df.subtype)


def load_mendeley_sms() -> pd.DataFrame:
    df = pd.read_csv(RAW / "mendeley_sms" / "Dataset_5971.csv", encoding="utf-8")
    sub = df["LABEL"].str.strip().str.lower()           # ham | spam | smishing
    return frame(df["TEXT"], (sub != "ham").astype(int), "en", "mendeley_sms", "sms", sub)


# ---------------------------------------------------------------- español
def load_softecapps() -> pd.DataFrame:
    parts = []
    for name in ("train.csv", "test.csv"):
        d = pd.read_csv(RAW / "softecapps" / name, skipinitialspace=True, encoding="utf-8")
        d.columns = ["text", "subtype"]
        parts.append(d)
    df = pd.concat(parts, ignore_index=True)
    df["subtype"] = df.subtype.str.strip().str.lower()

    fixes = pd.read_csv(MANUAL / "relabel_es.csv", encoding="utf-8")
    fix_map = dict(zip(fixes.text, fixes.label_nueva))
    relabeled = df.text.isin(fix_map)
    df.loc[relabeled, "subtype"] = df.loc[relabeled, "text"].map(fix_map)

    out = frame(df.text, (df.subtype == "spam").astype(int), "es", "softecapps", "sms", df.subtype)
    out["relabeled"] = relabeled.astype(int).values
    return out


def load_spaphish() -> pd.DataFrame:
    df = pd.read_csv(RAW / "spaphish" / "spaphish.csv", encoding="utf-8-sig")
    # Correos -> asunto + primeros 500 caracteres del cuerpo, para acercarlos a un mensaje.
    text = df.subject.fillna("").astype(str) + " " + df.body.fillna("").astype(str).str[:500]
    sub = df.Label.map({1: "phishing", 0: "ham"})
    return frame(text, df.Label.astype(int), "es", "spaphish", "email", sub)


def load_manual(lang: str) -> pd.DataFrame:
    path = MANUAL / f"{lang}_manual.csv"
    df = pd.read_csv(path, encoding="utf-8", dtype={"label": "Int64"})
    if df.empty:
        return pd.DataFrame(columns=COLS)
    return frame(df.text, df.label.astype(int), lang, "manual", df.channel.fillna("sms"),
                 df.label.map({1: "scam", 0: "ham"}))


# ---------------------------------------------------------------- limpieza
def clean(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    stats = {"rows_in": len(df)}
    df = df.copy()
    # Algunas fuentes traen el carácter de reemplazo U+FFFD por errores de codificación.
    df["text"] = df.text.astype(str).str.replace("\ufffd", " ", regex=False).str.strip()
    df["_key"] = df.text.map(preprocess)
    df = df[df._key.str.len() > 0]
    stats["rows_non_empty"] = len(df)

    # Mismo texto (tras preprocesar) con etiquetas distintas: se queda la de estafa
    # (más prudente para un detector) y se cuenta para el informe.
    conflicts = df.groupby("_key").label.nunique()
    stats["label_conflicts"] = int((conflicts > 1).sum())
    # Orden estable: a igualdad de etiqueta gana la fuente cargada primero (manual).
    df = df.sort_values(["label", "relabeled"], ascending=False, kind="stable")
    df = df.drop_duplicates("_key", keep="first")
    stats["rows_after_dedup"] = len(df)
    return df.drop(columns="_key").reset_index(drop=True), stats


def split(df: pd.DataFrame) -> pd.DataFrame:
    strat = df.label.astype(str) + "_" + df.source
    # Si un estrato tiene menos de 2 filas, se estratifica solo por etiqueta.
    if strat.value_counts().min() < 2:
        strat = df.label
    dev_idx, test_idx = train_test_split(df.index, test_size=TEST_SIZE,
                                         random_state=SEED, stratify=strat)
    df = df.copy()
    df["split"] = "dev"
    df.loc[test_idx, "split"] = "test"
    return df.sample(frac=1, random_state=SEED).reset_index(drop=True)


def main() -> None:
    PROCESSED.mkdir(parents=True, exist_ok=True)
    langs = {
        "en": [load_manual("en"), load_uci(), load_mendeley_sms()],
        "es": [load_manual("es"), load_softecapps(), load_spaphish()],
    }
    for lang, parts in langs.items():
        parts = [p for p in parts if not p.empty]
        df, stats = clean(pd.concat(parts, ignore_index=True))
        df = split(df)
        out = PROCESSED / f"{lang}.csv"
        df.to_csv(out, index=False, encoding="utf-8")

        print(f"\n=== {lang.upper()} -> {out.name}")
        for k, v in stats.items():
            print(f"  {k:18} {v:>6}")
        print(df.groupby(["source", "label"]).size().unstack(fill_value=0).to_string())
        print("  split:", df.split.value_counts().to_dict(),
              "| relabeled:", int(df.relabeled.sum()))


if __name__ == "__main__":
    main()

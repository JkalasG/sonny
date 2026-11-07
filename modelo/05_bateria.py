"""Evalúa la batería de mensajes de consideraciones.md (11.3) con los modelos exportados.

NO se usa para entrenar: es una comprobación honesta con mensajes del estilo
de los que recibirá una persona mayor. Simula el filtro 1 sin internet.

Uso:  python 05_bateria.py   ->  reports/bateria.md
"""

from __future__ import annotations

import json

import pandas as pd

import config as C
from importlib import import_module

score_rounded = import_module("04_export").score_rounded


def verdict(p: float, th: dict) -> str:
    if p >= th["scam"]:
        return "🛑 estafa"
    if p >= th["safe"]:
        return "⚠️ dudoso"
    return "✅ parece normal"


def main() -> None:
    models = {l: json.loads((C.EXPORTS / f"{l}.sonny").read_text(encoding="utf-8"))
              for l in ("en", "es")}
    df = pd.read_csv(C.MANUAL / "bateria.csv", encoding="utf-8")
    rows = ["# Batería de prueba (filtro 1, sin internet)", "",
            "Mensajes de `consideraciones.md` 11.3. **No** se usan para entrenar.", "",
            "| Idioma | Tipo | Real | p | Veredicto sin internet | ¿Bien? |", "|---|---|---|---|---|---|"]
    ok_total = 0
    for r in df.itertuples():
        m = models[r.lang]
        p = score_rounded(m, r.text)
        v = verdict(p, m["thresholds"])
        # Bien = estafa no sale ✅ y legítimo no sale 🛑 (dudoso es aceptable sin internet).
        ok = (r.label == 1 and not v.startswith("✅")) or (r.label == 0 and not v.startswith("🛑"))
        ok_total += ok
        rows.append(f"| {r.lang} | {r.tipo} | {'estafa' if r.label else 'legítimo'} | "
                    f"{p:.3f} | {v} | {'✅' if ok else '❌'} |")
        print(f"{'OK ' if ok else 'MAL'} [{r.lang}] p={p:.3f} {v:18} {r.text[:70]}")
    rows += ["", f"Aciertos (estafa nunca ✅, legítimo nunca 🛑): **{ok_total}/{len(df)}**", ""]
    (C.REPORTS / "bateria.md").write_text("\n".join(rows), encoding="utf-8")
    print(f"\n{ok_total}/{len(df)} -> reports/bateria.md")


if __name__ == "__main__":
    main()

"""Descarga los datasets públicos en data/raw/ (ignorado en git).

Uso:  python 01_download.py [--force]

Si una descarga falla y existe una copia local en ../dataset/, se usa esa.
"""

from __future__ import annotations

import argparse
import shutil
import urllib.request
import zipfile

from config import SOURCES

UA = {"User-Agent": "sonny-training/1.0"}


def download(url: str, dest) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as r:
        data = r.read()
    if data[:15].lstrip().lower().startswith((b"<!doctype", b"<html")):
        raise RuntimeError("el servidor devolvió una página HTML en vez del archivo")
    dest.write_bytes(data)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="volver a descargar aunque exista")
    args = ap.parse_args()

    for name, src in SOURCES.items():
        dest = src["dest"]
        if dest.exists() and not args.force:
            print(f"[=] {name}: ya existe ({dest.relative_to(dest.parents[2])})")
        else:
            try:
                download(src["url"], dest)
                print(f"[+] {name}: descargado ({dest.stat().st_size:,} bytes)")
            except Exception as e:  # noqa: BLE001
                fb = src.get("local_fallback")
                if fb and fb.exists():
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy(fb, dest if fb.suffix else dest.with_name(fb.name))
                    print(f"[~] {name}: descarga fallida ({e}); copiado de {fb}")
                else:
                    raise SystemExit(f"[x] {name}: no se pudo descargar: {e}")

        if dest.suffix == ".zip" and dest.exists():
            with zipfile.ZipFile(dest) as z:
                for member in z.namelist():
                    # Evita rutas absolutas o con '..' dentro del zip.
                    if member.startswith(("/", "\\")) or ".." in member:
                        continue
                    z.extract(member, dest.parent)


if __name__ == "__main__":
    main()

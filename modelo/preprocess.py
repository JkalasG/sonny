"""Preprocesado del texto de Sonny (fuente única en Python).

DEBE producir exactamente la misma salida que `js/preprocess.ts`.
Cualquier cambio aquí obliga a cambiar el archivo TypeScript, volver a
exportar los modelos y pasar `npm test` (pruebas de coincidencia).

Reglas, en este orden:
  1. NFKD y eliminar marcas diacríticas (Unicode Mn) y caracteres de formato
     invisibles (Unicode Cf: U+200B-U+200F, U+2060, U+FEFF...). Los estafadores
     los usan para esquivar filtros; ver reports/analisis.md, sección 9.
  2. Minúsculas (y sigma final "ς" -> "σ", porque JS y Python la tratan distinto).
  3. Correos -> " mailtok ".
  4. Enlaces con http(s):// o www. -> " urltok ".
  5. Dominios sueltos -> " urltok ".
  6. Teléfonos (8 o más caracteres entre dígitos, espacios y guiones) -> " phonetok ".
  7. Cualquier otro número -> "0".
  8. Espacios múltiples -> uno solo; recortar extremos.

Notas de compatibilidad Python <-> JavaScript:
  * No se usa `\\s`, `\\S`, `\\w` ni `\\d`: cada lenguaje los define distinto
    con caracteres no ingleses. Se usa la clase explícita WS, que coincide con
    lo que Python considera espacio (`str.isspace`), que es lo que usa
    scikit-learn al dividir palabras.
  * `\\b` solo aparece en DOM_RE y se compila con `re.ASCII`, para que su
    definición de "letra" sea la misma que en JavaScript ([A-Za-z0-9_]).
"""

from __future__ import annotations

import re
import unicodedata

# Mismos caracteres que str.isspace() en Python 3 (y que \s de `re` en modo Unicode).
WS_CHARS = (
    "\t\n\x0b\x0c\r\x1c\x1d\x1e\x1f \x85\xa0\u1680"
    "\u2000-\u200a\u2028\u2029\u202f\u205f\u3000"
)
WS = f"[{WS_CHARS}]"
NOT_WS = f"[^{WS_CHARS}]"

MAIL_RE = re.compile(r"[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}")
URL_RE = re.compile(rf"https?://{NOT_WS}+|www\.{NOT_WS}+")
DOM_RE = re.compile(rf"\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{{2,6}}\b(?:/{NOT_WS}*)?", re.ASCII)
PHONE_RE = re.compile(r"\+?[0-9][0-9 \-]{6,}[0-9]")
NUM_RE = re.compile(r"[0-9]+")
WS_RE = re.compile(f"{WS}+")


def preprocess(text: str) -> str:
    t = unicodedata.normalize("NFKD", text)
    t = "".join(c for c in t if unicodedata.category(c) not in ("Mn", "Cf"))
    t = t.lower().replace("ς", "σ")
    t = MAIL_RE.sub(" mailtok ", t)
    t = URL_RE.sub(" urltok ", t)
    t = DOM_RE.sub(" urltok ", t)
    t = PHONE_RE.sub(" phonetok ", t)
    t = NUM_RE.sub("0", t)
    return WS_RE.sub(" ", t).strip()


# Casos difíciles que se exportan con su salida esperada para el test de JS.
PARITY_CASES: list[str] = [
    "Su paquete está retenido. Pague 1,99€ en: correos-envio.info/pago",
    "Your package is on hold. Pay $1.99 at https://bit.ly/3xYz now!",
    "Cuéntame, ¿cómo estás? Ñandú, pingüino, acción.",
    "Llama al +591 712-34567 o al 800 10 2030 hoy",
    "Tu código es 482913. No lo compartas.",
    "Escríbenos a soporte@banco-seguro.com.bo URGENTE",
    "Visita www.ejemplo.com/ruta?x=1&y=2 o EJEMPLO.ORG",
    "santander.com.verificacion-segura.net/login",
    "http://185.23.11.4/login",
    "Emoji 😀👍🏽 y texto con\u00a0espacio duro\u2003y\u3000raros",
    "Separadores\x1cde\x1dcontrol\x85y\u2028línea",
    "BOM\ufeffinvisible y ZWSP\u200bentre",
    "Ver\u200cifi\u200cque su cu\u200denta ban\u2060caria\u00ad ya",
    "Escribí aquí.Gracias por todo, ver mi.web.com.bo/x",
    "ΣΟΦΟΣ ΟΔΥΣΣΕΥΣ σοφός",
    "İstanbul DİKKAT ß straße ﬁnal",
    "øresund.dk et æble",
    "   espacios    múltiples\n\n\ty saltos   ",
    "Hola mamá, se me rompió el celular, este es mi número nuevo",
    "WINNER!! You have won £900. Call 09061701461 now. Code KL341",
    "",
]

// Preprocesado de Sonny: réplica EXACTA de modelo/preprocess.py.
// Si cambias algo aquí, cámbialo también en Python, reexporta y pasa `npm test`.
//
// No se usa \s, \S, \w ni \d: JavaScript y Python los definen distinto.
// WS = los mismos caracteres que Python considera espacio (str.isspace).
// \b solo aparece en DOM_RE; sin la bandera "u" significa [A-Za-z0-9_],
// igual que en Python con re.ASCII.

const WS_CHARS =
  "\\t\\n\\x0b\\x0c\\r\\x1c\\x1d\\x1e\\x1f \\x85\\xa0\\u1680" +
  "\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";
const NOT_WS = `[^${WS_CHARS}]`;

const MAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g;
const URL_RE = new RegExp(`https?://${NOT_WS}+|www\\.${NOT_WS}+`, "g");
const DOM_RE = new RegExp(
  `\\b[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.[a-z]{2,6}\\b(?:/${NOT_WS}*)?`,
  "g",
);
const PHONE_RE = /\+?[0-9][0-9 \-]{6,}[0-9]/g;
const NUM_RE = /[0-9]+/g;
const WS_RE = new RegExp(`[${WS_CHARS}]+`, "g");
// Marcas diacríticas (Mn) y caracteres de formato invisibles (Cf), igual que en Python.
const MN_RE = /[\p{Mn}\p{Cf}]/gu;

export function preprocess(text: string): string {
  let t = text.normalize("NFKD").replace(MN_RE, "");
  t = t.toLowerCase().replace(/ς/g, "σ");
  t = t.replace(MAIL_RE, " mailtok ");
  t = t.replace(URL_RE, " urltok ");
  t = t.replace(DOM_RE, " urltok ");
  t = t.replace(PHONE_RE, " phonetok ");
  t = t.replace(NUM_RE, "0");
  return t.replace(WS_RE, " ").trim();
}

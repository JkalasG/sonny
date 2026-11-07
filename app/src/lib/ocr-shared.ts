// Común al OCR web y nativo.

export type OcrImage = { imageBase64: string; imageMimeType: string; uri?: string };

const letters = (s: string) => (s.match(/\p{L}/gu) ?? []).length;

// Rótulos de la pantalla del celular que no son parte del mensaje (cabecera de la app de mensajes).
// Cada patrón debe cubrir la línea ENTERA: nunca se quita texto que forme parte del mensaje.
const UI_LINES = [
  /^(mensaje de texto|text message|imessage)\b.{0,20}$/i, // "Mensaje de texto · SMS"
  /^(sms|mms|rcs)$/i,
  /^(hoy|ayer|today|yesterday|ahora|now)\b[\s,·-]*(\d{1,2}:\d{2}\s*([ap]\.?\s?m\.?)?)?$/i, // "hoy, 11:55"
  /^(entregado|delivered|le[ií]do|read)\b[\s\d:,·-]*$/i,
  /^\W*\+?\d[\d\s().-]{5,}\W*$/, // número del remitente
];
const isUiLine = (l: string) => UI_LINES.some((re) => re.test(l));

/**
 * Limpia la salida del OCR para quedarse con el mensaje:
 * quita líneas casi sin letras (iconos, restos de la barra de estado), rótulos como "Mensaje de texto · SMS",
 * "hoy, 11:55" o el número del remitente, y une en un párrafo las líneas que la burbuja partió al ajustar el texto.
 */
export function cleanOcrText(raw: string): string {
  return raw
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => letters(l) >= 3 && !isUiLine(l))
    .join(" ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

// Hay texto suficiente para analizar (si no, la foto se considera ilegible).
export function enoughText(text: string): boolean {
  return letters(text) >= 15;
}

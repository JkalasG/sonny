// Común al OCR web y nativo.

export type OcrImage = { imageBase64: string; imageMimeType: string; uri?: string };

// Limpia la salida del OCR: quita líneas sin letras (horas, iconos, barras de estado) y espacios de más.
export function cleanOcrText(raw: string): string {
  return raw
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => (l.match(/\p{L}/gu) ?? []).length >= 2)
    .join("\n")
    .trim();
}

// Hay texto suficiente para analizar (si no, la foto se considera ilegible).
export function enoughText(text: string): boolean {
  return (text.match(/\p{L}/gu) ?? []).length >= 15;
}

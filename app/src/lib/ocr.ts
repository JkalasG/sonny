// OCR en el celular: ML Kit (Android) / Vision (iOS) mediante expo-text-extractor, sin internet.
// En Android el modelo de ML Kit va dentro de la APK (plugins/with-bundled-text-recognition.js), así que
// lee fotos sin conexión desde el primer uso. Es un módulo nativo: funciona en la APK (EAS build), no en
// Expo Go; ahí no hay OCR local y las fotos siguen necesitando la IA.

import { cleanOcrText, type OcrImage } from "./ocr-shared";

type Extractor = { isSupported: boolean; extractTextFromImage(uri: string): Promise<string[]> };

let extractor: Extractor | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  extractor = require("expo-text-extractor") as Extractor;
} catch {
  extractor = null; // Expo Go: el módulo nativo no existe
}

export const ocrAvailable = !!extractor?.isSupported;

export async function readTextFromImage(img: OcrImage): Promise<string> {
  if (!extractor?.isSupported || !img.uri) return "";
  const lines = await extractor.extractTextFromImage(img.uri);
  return cleanOcrText(lines.join("\n"));
}

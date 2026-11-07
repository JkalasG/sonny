// OCR en el navegador con tesseract.js: la foto no sale del equipo y funciona sin IA ni internet.
// Los archivos están en public/ocr/ (npm run sync-ocr) y solo se cargan la primera vez que se lee una foto.

import { cleanOcrText, type OcrImage } from "./ocr-shared";

type TesseractWorker = { recognize(image: string): Promise<{ data: { text: string } }> };
type TesseractGlobal = {
  createWorker(langs: string[], oem: number, options: Record<string, unknown>): Promise<TesseractWorker>;
};

let worker: Promise<TesseractWorker> | null = null;

const abs = (path: string) => new URL(path, window.location.href).href;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`no se pudo cargar ${src}`));
    document.head.appendChild(s);
  });
}

async function getWorker(): Promise<TesseractWorker> {
  const w = window as unknown as { Tesseract?: TesseractGlobal };
  if (!w.Tesseract) await loadScript(abs("/ocr/tesseract.min.js"));
  return w.Tesseract!.createWorker(["eng", "spa"], 1 /* OEM.LSTM_ONLY */, {
    workerPath: abs("/ocr/worker.min.js"),
    corePath: abs("/ocr/core"),
    langPath: abs("/ocr/lang"),
    workerBlobURL: false,
  });
}

export const ocrAvailable = true;

export async function readTextFromImage(img: OcrImage): Promise<string> {
  worker ??= getWorker().catch((e) => {
    worker = null; // reintentar la próxima vez
    throw e;
  });
  const w = await worker;
  const { data } = await w.recognize(`data:${img.imageMimeType};base64,${img.imageBase64}`);
  return cleanOcrText(data.text);
}

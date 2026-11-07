// Fotos y capturas: elegir/tomar, reducir a ≤ 1600 px y comprimir JPEG 0,7 (consideraciones.md 6.5).
// Voz: expo-speech, pausada y en el idioma del usuario.

import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as Speech from "expo-speech";

import type { Lang } from "./settings";

export type PickedImage = { imageBase64: string; imageMimeType: "image/jpeg"; uri: string }; // uri: para el OCR del celular
export type PickResult = PickedImage | "canceled" | "denied";

export async function pickImage(source: "camera" | "library"): Promise<PickResult> {
  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return "denied";
  }
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1 };
  const r = source === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (r.canceled || !r.assets?.[0]) return "canceled";

  const ctx = ImageManipulator.manipulate(r.assets[0].uri);
  const { width, height } = r.assets[0];
  if (Math.max(width, height) > 1600) {
    ctx.resize(width >= height ? { width: 1600, height: null } : { width: null, height: 1600 });
  }
  const ref = await ctx.renderAsync();
  const out = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!out.base64) return "canceled";
  return { imageBase64: out.base64.replace(/^data:image\/\w+;base64,/, ""), imageMimeType: "image/jpeg", uri: out.uri };
}

export function speak(text: string, lang: Lang, onDone?: () => void) {
  Speech.stop();
  Speech.speak(text, {
    language: lang === "es" ? "es-US" : "en-US",
    rate: 0.85, // pausada
    onDone,
    onStopped: onDone,
    onError: onDone,
  });
}

export function stopSpeaking() {
  Speech.stop();
}

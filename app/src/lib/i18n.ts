// Textos de la interfaz. Sonny habla en primera persona, como un nieto (consideraciones.md 3).
// Español neutro latinoamericano. "tu" = tuteo (por defecto), "usted" = trato de usted.
// Frases de menos de 12 palabras, sin tecnicismos.

import { useCallback } from "react";

import { useSettings, type Formality, type Lang } from "./settings";

type Entry = { en: string; tu: string; usted?: string };

const T = {
  // Bienvenida
  welcomeHello: { en: "Hi, I'm Sonny.", tu: "Hola, soy Sonny." },
  welcomeIntro: {
    en: "Before you tap a strange message, ask me. I'll tell you if it's a scam.",
    tu: "Antes de tocar un mensaje raro, pregúntame. Te digo si es una estafa.",
    usted: "Antes de tocar un mensaje raro, pregúnteme. Le digo si es una estafa.",
  },
  chooseLanguage: { en: "Choose your language", tu: "Elige tu idioma", usted: "Elija su idioma" },
  chooseFormality: { en: "", tu: "¿Cómo prefieres que te hable?", usted: "¿Cómo prefiere que le hable?" },
  formalityTu: { en: "", tu: "De tú (“¿estás bien?”)" },
  formalityUsted: { en: "", tu: "De usted (“¿está bien?”)" },
  start: { en: "Start", tu: "Empezar" },

  // Inicio
  homeQuestion: { en: "Did you get a strange message?", tu: "¿Te llegó un mensaje raro?", usted: "¿Le llegó un mensaje raro?" },
  takePhoto: { en: "Take a photo of it", tu: "Tómale una foto", usted: "Tómele una foto" },
  pickScreenshot: { en: "Choose a screenshot", tu: "Elige una captura", usted: "Elija una captura" },
  pastePlaceholder: {
    en: "Paste or type the message here",
    tu: "Pega o escribe aquí el mensaje",
    usted: "Pegue o escriba aquí el mensaje",
  },
  paste: { en: "Paste", tu: "Pegar" },
  check: { en: "Check it", tu: "Revisar" },
  examples: { en: "Try examples", tu: "Probar ejemplos" },
  settings: { en: "Settings", tu: "Ajustes" },
  modelResults: { en: "How well does Sonny work?", tu: "¿Qué tan bien funciona Sonny?" },
  analyzing: { en: "Let me check it… one moment.", tu: "Déjame revisarlo… un momento.", usted: "Déjeme revisarlo… un momento." },
  emptyMessage: {
    en: "I didn't find a message. Shall we try again?",
    tu: "No encontré ningún mensaje. ¿Lo intentamos otra vez?",
  },
  photoNeedsInternet: {
    en: "Without internet I can't read photos. Can you type or paste the message?",
    tu: "Sin conexión no puedo leer fotos. ¿Me escribes o pegas el mensaje?",
    usted: "Sin conexión no puedo leer fotos. ¿Me escribe o pega el mensaje?",
  },
  photoUnreadable: {
    en: "I can't read the photo well. Try getting closer, or type the message.",
    tu: "No puedo leer bien la foto. Acércate más o escribe el mensaje.",
    usted: "No puedo leer bien la foto. Acérquese más o escriba el mensaje.",
  },
  photoPrivacy: {
    en: "If the photo shows personal data, you can cover it with your finger.",
    tu: "Si en la foto salen datos personales, puedes taparlos con el dedo.",
    usted: "Si en la foto salen datos personales, puede taparlos con el dedo.",
  },
  permissionDenied: {
    en: "I need permission to use the camera. You can allow it in Settings.",
    tu: "Necesito permiso para usar la cámara. Puedes darlo en Ajustes.",
    usted: "Necesito permiso para usar la cámara. Puede darlo en Ajustes.",
  },

  // Resultado
  whatNow: { en: "What do I do now?", tu: "¿Qué hago ahora?" },
  why: { en: "Why?", tu: "¿Por qué?" },
  listen: { en: "Listen", tu: "Escuchar" },
  stopListening: { en: "Stop", tu: "Parar" },
  checkAnother: { en: "Check another message", tu: "Revisar otro mensaje" },
  goodJob: {
    en: "You did well to ask me. That's what I'm here for.",
    tu: "Hiciste muy bien en preguntarme. Para eso estoy.",
    usted: "Hizo muy bien en preguntarme. Para eso estoy.",
  },
  offlineNotice: { en: "No connection: basic check.", tu: "Sin conexión: revisión básica." },
  aiFailedNotice: {
    en: "I couldn't get a second opinion: basic check.",
    tu: "No pude pedir una segunda opinión: revisión básica.",
  },
  otherLanguageNotice: {
    en: "This message is in Spanish. Here's what it says:",
    tu: "Este mensaje está en inglés. Esto es lo que dice:",
  },
  closing: {
    en: "If in doubt, do nothing and call someone you trust. Waiting is never dangerous.",
    tu: "Si tienes dudas, no hagas nada y llama a alguien de confianza. Esperar nunca es peligroso.",
    usted: "Si tiene dudas, no haga nada y llame a alguien de confianza. Esperar nunca es peligroso.",
  },
  disclaimer: {
    en: "Sonny helps, but can be wrong. If in doubt, always call the official number.",
    tu: "Sonny te ayuda, pero puede equivocarse. Ante la duda, llama siempre al número oficial.",
    usted: "Sonny le ayuda, pero puede equivocarse. Ante la duda, llame siempre al número oficial.",
  },
  back: { en: "← Back", tu: "← Volver" },
  backShort: { en: "Back", tu: "Volver" },
  verdictScam: { en: "Scam", tu: "Estafa" },
  verdictSuspicious: { en: "Wait", tu: "Dudoso" },
  verdictSafe: { en: "Looks normal", tu: "Parece normal" },
  forwardedLabel: { en: "The message you showed me", tu: "El mensaje que me mostraste", usted: "El mensaje que me mostró" },
  orType: { en: "Or paste the message here", tu: "O pega aquí el mensaje", usted: "O pegue aquí el mensaje" },

  // Qué hago ahora
  stepsTitle: { en: "What to do, one step at a time", tu: "Qué hacer, paso a paso" },
  alreadyGaveData: { en: "Did you already give your details?", tu: "¿Ya diste tus datos?", usted: "¿Ya dio sus datos?" },
  yesWhatDo: { en: "Yes, what do I do?", tu: "Sí, ¿qué hago?" },
  calmFirst: {
    en: "Stay calm. These scams fool many people. Let's fix it.",
    tu: "Tranquilo. Estas estafas engañan a mucha gente. Lo arreglamos.",
    usted: "Tranquilo. Estas estafas engañan a mucha gente. Lo arreglamos.",
  },

  // ¿Por qué?
  whyTitle: { en: "Why I think so", tu: "Por qué lo pienso" },
  yourMessage: { en: "Your message", tu: "Tu mensaje", usted: "Su mensaje" },
  legendScam: { en: "pushes towards scam", tu: "empuja hacia estafa" },
  legendLegit: { en: "pushes towards normal", tu: "empuja hacia normal" },
  linkSignals: { en: "What I saw in the links", tu: "Lo que vi en los enlaces" },
  aiSignals: { en: "What the second opinion saw", tu: "Lo que vio la segunda opinión" },
  noLinks: { en: "There are no links in the message.", tu: "El mensaje no tiene enlaces." },
  howIDecided: { en: "How I decided", tu: "Cómo lo decidí" },
  decidedModel: {
    en: "My own model, here on your phone, without sending the message.",
    tu: "Con mi propio modelo, aquí en tu celular, sin enviar el mensaje.",
    usted: "Con mi propio modelo, aquí en su celular, sin enviar el mensaje.",
  },
  decidedModelAi: {
    en: "My own model on your phone, plus a second opinion from an AI.",
    tu: "Mi propio modelo en tu celular, más la segunda opinión de una IA.",
    usted: "Mi propio modelo en su celular, más la segunda opinión de una IA.",
  },

  // Ajustes
  settingsTitle: { en: "Settings", tu: "Ajustes" },
  language: { en: "Language", tu: "Idioma" },
  formality: { en: "How I talk to you (Spanish)", tu: "Cómo te hablo", usted: "Cómo le hablo" },
  voice: { en: "Voice (a “Listen” button)", tu: "Voz (botón “Escuchar”)" },
  detailed: { en: "Detailed mode (show scores)", tu: "Modo detallado (ver puntuaciones)" },
  on: { en: "On", tu: "Sí" },
  theme: { en: "Appearance", tu: "Apariencia" },
  themeLight: { en: "Light", tu: "Claro" },
  themeDark: { en: "Dark", tu: "Oscuro" },
  off: { en: "Off", tu: "No" },
  privacy: {
    en: "Your settings stay only on this device. Clear scams never leave your phone.",
    tu: "Tus ajustes se quedan en este equipo. Las estafas claras no salen de tu celular.",
    usted: "Sus ajustes se quedan en este equipo. Las estafas claras no salen de su celular.",
  },

  // Ejemplos
  examplesTitle: { en: "Examples to try", tu: "Ejemplos para probar" },
  examplesIntro: {
    en: "For demos: tap one and I'll check it.",
    tu: "Para demostraciones: toca uno y lo reviso.",
    usted: "Para demostraciones: toque uno y lo reviso.",
  },

  // Menú
  navCheck: { en: "Check", tu: "Revisar" },
  navExamples: { en: "Examples", tu: "Ejemplos" },
  navModel: { en: "Results", tu: "Resultados" },
  navSettings: { en: "Settings", tu: "Ajustes" },
  menuLabel: { en: "Main menu", tu: "Menú principal" },

  // Inicio (tarjeta)
  showMe: { en: "Show me the message", tu: "Muéstrame el mensaje", usted: "Muéstreme el mensaje" },
  orWord: { en: "or", tu: "o" },
  photoShort: { en: "Photo", tu: "Foto" },
  screenshotShort: { en: "Screenshot", tu: "Captura" },
  featScam: { en: "I spot scams in seconds", tu: "Detecto estafas al momento" },
  featPhotos: { en: "I read screenshots and photos", tu: "Leo capturas y fotos" },
  featOffline: { en: "I work without internet", tu: "Funciono sin internet" },
  worksOffline: {
    en: "Works without internet. Clear scams never leave your phone.",
    tu: "Funciona sin internet. Las estafas claras no salen de tu celular.",
    usted: "Funciona sin internet. Las estafas claras no salen de su celular.",
  },
} satisfies Record<string, Entry>;

export type TKey = keyof typeof T;

export function translate(key: TKey, lang: Lang, formality: Formality): string {
  const e: Entry = T[key];
  if (lang === "en") return e.en;
  return formality === "usted" ? (e.usted ?? e.tu) : e.tu;
}

export function useT() {
  const { settings } = useSettings();
  return useCallback(
    (key: TKey) => translate(key, settings.language, settings.formality),
    [settings.language, settings.formality],
  );
}

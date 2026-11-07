// Sistema de diseño de Sonny: el guardián azul de gorro y la caja fuerte (mascota en assets/images, logo en assets/brand).
// Azul cielo de la mascota como color de marca + azul marino del logo para texto y acciones; dorado del escudo como acento.
// Titulares en Fredoka (redonda y suave como la mascota); cuerpo en Atkinson Hyperlegible (diseñada para baja visión).
// Accesibilidad: consideraciones.md 4.2 (texto ≥ 17 px, cuerpo 20 px, botones 64 px, contraste AA).

import { useWindowDimensions } from "react-native";

import { useSettings } from "./settings";

const light = {
  bg: "#F2F6FB",          // blanco azulado
  surface: "#FFFFFF",
  ink: "#15294A",         // azul marino (trazo del logo)
  ink2: "#4D5F7C",
  line: "#DAE3EE",
  primary: "#2C5A8C",     // azul denim (gorro): acciones
  primaryPressed: "#224A75",
  primaryInk: "#FFFFFF",
  soft: "#E5EEF8",
  softInk: "#15294A",
  brand: "#BCD7F1",       // azul cielo (cuerpo de la mascota): marca
  brandInk: "#15294A",
  gold: "#C99A3E",        // dorado del escudo: acento
  hero: "#2C5A8C",        // bloque principal (bienvenida, inicio): degradado denim -> azul marino
  heroTo: "#15294A",
  heroInk: "#FFFFFF",
  heroSoft: "#FFFFFF1F",
  sonnyBubble: "#E3EEFA", // burbuja de Sonny
  userBubble: "#FFFFFF",
  focus: "#2C5A8C",
  scam: "#C0261B",
  scamBg: "#FDECEA",
  warn: "#8F5200",
  warnBg: "#FFF1D2",
  safe: "#1B7A43",
  safeBg: "#E3F4E9",
  toScam: "#EB6834",      // explicabilidad (paleta validada de las figuras)
  toLegit: "#2A78D6",
  neutralBar: "#B4BFCD",
};

// Modo oscuro diseñado (no invertido): noche azul marino profunda; la marca y el dorado se mantienen.
const dark: typeof light = {
  bg: "#0B1424",
  surface: "#121F35",
  ink: "#EDF3FB",
  ink2: "#A8B8CE",
  line: "#22344F",
  primary: "#9CC4EE",
  primaryPressed: "#84B3E4",
  primaryInk: "#0B1424",
  soft: "#1A2B45",
  softInk: "#EDF3FB",
  brand: "#A9CBEC",
  brandInk: "#15294A",
  gold: "#E2B65C",
  hero: "#24466F",
  heroTo: "#14253F",
  heroInk: "#FFFFFF",
  heroSoft: "#FFFFFF1A",
  sonnyBubble: "#1B3150",
  userBubble: "#16263D",
  focus: "#E2B65C",
  scam: "#FF8A7F",
  scamBg: "#3B1A1F",
  warn: "#FFCF70",
  warnBg: "#3A2E12",
  safe: "#7BD89D",
  safeBg: "#13322A",
  toScam: "#F07A48",
  toLegit: "#5A9CEB",
  neutralBar: "#4E5F78",
};

export type Colors = typeof light;

/** Modo oscuro: lo elige el usuario en Ajustes (por defecto, claro). */
export function useIsDark(): boolean {
  return useSettings().settings.theme === "dark";
}

export function useColors(): Colors {
  return useIsDark() ? dark : light;
}

/** Computadora o tableta en horizontal: menú arriba y pantallas a dos columnas. */
export function useWide() {
  return useWindowDimensions().width >= 900;
}

export const font = {
  regular: "AtkinsonHyperlegible_400Regular",
  bold: "AtkinsonHyperlegible_700Bold",
  display: "Fredoka_600SemiBold",
  displayMid: "Fredoka_500Medium",
};

// Escala tipográfica (razón ~1,25 sobre 20 px): 17 · 20 · 24 · 30 · 38 · 52
export const size = {
  small: 17,
  body: 20,
  lead: 24,
  title: 30,
  headline: 38,
  hero: 52,
  button: 21,
  buttonHeight: 64,
  gap: 16,
  radius: 20,
  bubbleRadius: 28,
  maxWidth: 760,   // páginas de lectura
  maxWide: 1180,   // páginas a dos columnas
};

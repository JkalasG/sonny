// Sonny, la mascota: el guardián azul de gorro (diseño del equipo en nogit/diseno/mascota.jpg, recortado y con "SONNY"
// bordado por nogit/mascota-final/prep_mascota.py). PNG con fondo transparente.
//   happy: saludo · thinking: con la lupa, mientras analiza o ante la duda · worried: estafa.
// Grande (≥ 100 px): cuerpo entero, sin círculo. Pequeño: primer plano de la cara en un círculo azul cielo.
// El logo (caja fuerte con escudo) es vectorial: logo-svg.ts, con versión clara y oscura.
// Wordmark: "Sonny" con gorro y lupa (diseño del equipo), en versión clara y oscura.

import { Image, View } from "react-native";
import { SvgXml } from "react-native-svg";

import { useColors, useIsDark } from "../lib/theme";
import { LOGO_COLORS, LOGO_COLORS_DARK, logoSvg } from "./logo-svg";

export type Mood = "happy" | "thinking" | "worried";

const IMG: Record<Mood, number> = {
  happy: require("../../assets/images/sonny-mascot.png"),
  thinking: require("../../assets/images/sonny-thinking.png"),
  worried: require("../../assets/images/sonny-worried.png"),
};

// Primer plano: punto de la imagen (fracción del ancho/alto) que queda en el centro del círculo.
const FOCUS: Record<Mood, [number, number]> = { happy: [0.54, 0.4], thinking: [0.56, 0.42], worried: [0.56, 0.42] };
const ZOOM = 1.3;

export function SonnyAvatar({ size = 52, mood = "happy", ring = true, glow = false }: { size?: number; mood?: Mood; ring?: boolean; glow?: boolean }) {
  const c = useColors();
  if (size >= 100) {
    const img = (
      <Image
        source={IMG[mood]}
        style={{ width: glow ? size * 0.94 : size, height: glow ? size * 0.94 : size }}
        resizeMode="contain"
        accessible={false}
        accessibilityIgnoresInvertColors
      />
    );
    if (!glow) return img;
    // glow: halo azul cielo detrás, para los bloques azul marino
    return (
      <View accessible={false} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.brand + "2E", alignItems: "center", justifyContent: "center" }}>
        {img}
      </View>
    );
  }
  const zoom = size * ZOOM;
  const [fx, fy] = FOCUS[mood];
  return (
    <View
      accessible={false}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        backgroundColor: c.brand,
        borderWidth: ring ? Math.max(2, Math.round(size / 26)) : 0,
        borderColor: c.surface,
      }}
    >
      <Image
        source={IMG[mood]}
        style={{ position: "absolute", width: zoom, height: zoom, left: size / 2 - fx * zoom, top: size / 2 - fy * zoom }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const LOGO_LIGHT = logoSvg(LOGO_COLORS);
const LOGO_DARK = logoSvg(LOGO_COLORS_DARK);

export function SonnyLogo({ size = 44 }: { size?: number }) {
  const dark = useIsDark();
  return (
    <View accessible={false} style={{ width: size, height: size }}>
      <SvgXml xml={dark ? LOGO_DARK : LOGO_LIGHT} width={size} height={size} />
    </View>
  );
}

// Wordmark del equipo (nogit/diseno/claro.jpg y oscuro.jpg, fondo quitado con nogit/mascota-final/prep_wordmark.py).
const WORDMARK = {
  light: require("../../assets/images/wordmark-light.png"),
  dark: require("../../assets/images/wordmark-dark.png"),
};
const WORDMARK_RATIO = 2.27; // ancho / alto

/** "Sonny" con gorro y lupa, versión clara u oscura según el tema. size ≈ tamaño de letra de referencia. */
export function Wordmark({ size = 34 }: { size?: number }) {
  const dark = useIsDark();
  const h = Math.round(size * 1.4);
  return (
    <Image
      source={dark ? WORDMARK.dark : WORDMARK.light}
      style={{ width: Math.round(h * WORDMARK_RATIO), height: h }}
      resizeMode="contain"
      accessible
      accessibilityRole="image"
      accessibilityLabel="Sonny"
      accessibilityIgnoresInvertColors
    />
  );
}

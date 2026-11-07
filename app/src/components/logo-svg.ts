// Logo de Sonny: la caja fuerte con el escudo (basado en el boceto del equipo, nogit/diseno/mascota.jpg).
// Fuente única: la usa <SonnyLogo> (react-native-svg); los íconos PNG de assets/images salen de aquí con nogit/mascota-final/icons.mjs.

export type LogoColors = { tile: string | null; ink: string; gold: string; goldLight: string };

export const LOGO_COLORS: LogoColors = { tile: "#BCD7F1", ink: "#15294A", gold: "#C99A3E", goldLight: "#E9C77E" };
/** Modo oscuro: azul marino con el trazo en azul cielo; el escudo dorado se mantiene. */
export const LOGO_COLORS_DARK: LogoColors = { tile: "#22406A", ink: "#CFE3F7", gold: "#C99A3E", goldLight: "#E9C77E" };

/** SVG 100×100. tile = null: sin fondo. radius: esquinas del fondo (0 = cuadrado, para los íconos de la app). */
export function logoSvg({ tile, ink, gold, goldLight }: LogoColors = LOGO_COLORS, radius = 24): string {
  const halo = tile ?? "none";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
${tile ? `<rect width="100" height="100" rx="${radius}" fill="${tile}"/>` : ""}
<g fill="none" stroke="${ink}" stroke-linecap="round" stroke-linejoin="round">
  <rect x="15" y="17" width="60" height="58" rx="8" stroke-width="5"/>
  <rect x="23.5" y="25.5" width="43" height="41" rx="4" stroke-width="3"/>
  <path d="M24 75v7M66 75v7" stroke-width="5"/>
  <path d="M15 31h5M15 61h5" stroke-width="5"/>
  <circle cx="45" cy="46" r="11" stroke-width="3.5"/>
  <circle cx="45" cy="46" r="3.5" stroke-width="3"/>
  <path d="M45 38.5v4M45 49.5v4M37.5 46h4M48.5 46h4M39.7 40.7l2.4 2.4M47.9 48.9l2.4 2.4M50.3 40.7l-2.4 2.4M42.1 48.9l-2.4 2.4" stroke-width="2.2"/>
</g>
<path d="M74 47l15 5.5v10.5c0 10-6.6 16.6-15 20c-8.4-3.4-15-10-15-20v-10.5z" fill="${halo}" stroke="${tile ?? "none"}" stroke-width="9" stroke-linejoin="round"/>
<path d="M74 47l15 5.5v10.5c0 10-6.6 16.6-15 20z" fill="${goldLight}"/>
<path d="M74 47l-15 5.5v10.5c0 10 6.6 16.6 15 20z" fill="${gold}"/>
<path d="M74 47l15 5.5v10.5c0 10-6.6 16.6-15 20c-8.4-3.4-15-10-15-20v-10.5z" fill="none" stroke="#15294A" stroke-width="3.2" stroke-linejoin="round"/>
<path d="M67.5 64.5l4.6 4.6l9-9.4" fill="none" stroke="#15294A" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

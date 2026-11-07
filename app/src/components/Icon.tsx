// Iconos propios (trazo de 2 px, esquinas redondeadas) en lugar de emojis:
// se ven igual en todos los celulares y toman el color del tema.

import Svg, { Circle, Path, Rect } from "react-native-svg";

export type IconName =
  | "camera" | "image" | "clipboard" | "settings" | "chart" | "back" | "speaker" | "stop"
  | "sparkle" | "scam" | "suspicious" | "safe" | "forward" | "phone" | "check" | "search" | "upload" | "sun" | "moon" | "shield";

export function Icon({ name, size = 28, color, inner = "#FFFFFF" }: { name: IconName; size?: number; color: string; inner?: string }) {
  const s = { stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  return (
    // Decorativo: el texto del botón ya dice lo que hace. aria-hidden lo oculta del lector de pantalla.
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {name === "sun" && (
        <>
          <Circle cx="12" cy="12" r="4" {...s} />
          <Path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" {...s} />
        </>
      )}
      {name === "moon" && <Path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" {...s} />}
      {name === "shield" && (
        <>
          <Path d="M12 3l7.5 2.8v5.7c0 4.6-3.1 7.9-7.5 9.5c-4.4-1.6-7.5-4.9-7.5-9.5V5.8z" {...s} />
          <Path d="M8.6 12.2l2.4 2.4l4.6-4.8" {...s} />
        </>
      )}
      {name === "camera" && (
        <>
          <Path d="M4 8h3l2-3h6l2 3h3v11H4z" {...s} />
          <Circle cx="12" cy="13" r="3.5" {...s} />
        </>
      )}
      {name === "image" && (
        <>
          <Rect x="3.5" y="4.5" width="17" height="15" rx="2.5" {...s} />
          <Circle cx="9" cy="10" r="1.8" {...s} />
          <Path d="M20 16l-5-5-8 8" {...s} />
        </>
      )}
      {name === "clipboard" && (
        <>
          <Rect x="5" y="5" width="14" height="16" rx="2.5" {...s} />
          <Path d="M9 5V3.5h6V5M9 11h6M9 15h4" {...s} />
        </>
      )}
      {name === "settings" && (
        <>
          <Circle cx="12" cy="12" r="3" {...s} />
          <Path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" {...s} />
        </>
      )}
      {name === "chart" && <Path d="M4 20V10M10 20V4M16 20v-7M22 20H2" {...s} />}
      {name === "back" && <Path d="M15 5l-7 7 7 7" {...s} strokeWidth={2.5} />}
      {name === "speaker" && <Path d="M4 9h4l5-4v14l-5-4H4zM16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12" {...s} />}
      {name === "stop" && <Rect x="6" y="6" width="12" height="12" rx="2" {...s} />}
      {name === "sparkle" && <Path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" {...s} />}
      {name === "forward" && <Path d="M14 6l6 6-6 6M20 12H9a5 5 0 00-5 5v1" {...s} />}
      {name === "phone" && <Path d="M5 4h3l2 5-2.5 1.5a11 11 0 005 5L14 13l5 2v3a2 2 0 01-2 2A15 15 0 013 6a2 2 0 012-2z" {...s} />}
      {name === "search" && (
        <>
          <Circle cx="10.5" cy="10.5" r="6.5" {...s} />
          <Path d="M15.5 15.5L21 21" {...s} strokeWidth={2.5} />
        </>
      )}
      {name === "upload" && <Path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M4 15v3.5A1.5 1.5 0 005.5 20h13a1.5 1.5 0 001.5-1.5V15" {...s} />}
      {name === "check" &&<Path d="M5 12.5l4.5 4.5L19 7.5" {...s} strokeWidth={2.5} />}
      {/* Veredictos: forma distinta para cada uno (no depender del color) */}
      {name === "scam" && (
        <>
          <Path d="M8.2 2.5h7.6l5.7 5.7v7.6l-5.7 5.7H8.2l-5.7-5.7V8.2z" fill={color} />
          <Path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke={inner} strokeWidth={2.6} strokeLinecap="round" />
        </>
      )}
      {name === "suspicious" && (
        <>
          <Path d="M12 2.8l10 17.5H2z" fill={color} strokeLinejoin="round" stroke={color} strokeWidth={1.5} />
          <Path d="M12 9v5" stroke={inner} strokeWidth={2.6} strokeLinecap="round" />
          <Circle cx="12" cy="17.2" r="1.5" fill={inner} />
        </>
      )}
      {name === "safe" && (
        <>
          <Circle cx="12" cy="12" r="10" fill={color} />
          <Path d="M7 12.5l3.3 3.3L17 9" stroke={inner} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      )}
    </Svg>
  );
}

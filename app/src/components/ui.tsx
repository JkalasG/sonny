// Componentes de Sonny. Celular: barra arriba + pestañas grandes abajo. Computadora: menú arriba
// y pantallas a dos columnas. Texto ≥ 17 px, botones de 64 px, icono + texto, foco visible
// (consideraciones.md 4.2–4.3).

import { useFocusEffect, usePathname, type Href } from "expo-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableStateCallbackType,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useT, type TKey } from "../lib/i18n";
import { go, goBack, screenReady } from "../lib/nav";
import type { Verdict } from "../lib/templates";
import { font, size, useColors, useIsDark, useWide, type Colors } from "../lib/theme";
import { Icon, type IconName } from "./Icon";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { useSettings } from "../lib/settings";
import { SonnyAvatar, Wordmark, type Mood } from "./SonnyAvatar";

type PressState = PressableStateCallbackType & { focused?: boolean; hovered?: boolean };
const focusRing = (c: Colors, offset = 2) => ({ outlineColor: c.focus, outlineWidth: 3, outlineStyle: "solid", outlineOffset: offset }) as ViewStyle;

/* ───────────── Menú ───────────── */

type NavItem = { href: Href; key: TKey; icon: IconName; match: string[] };
const NAV: NavItem[] = [
  { href: "/", key: "navCheck", icon: "search", match: ["/", "/result", "/steps", "/why"] },
  { href: "/examples", key: "navExamples", icon: "sparkle", match: ["/examples"] },
  { href: "/model", key: "navModel", icon: "chart", match: ["/model"] },
  { href: "/settings", key: "navSettings", icon: "settings", match: ["/settings"] },
];

function useActive() {
  const path = usePathname();
  return NAV.find((n) => n.match.includes(path))?.key;
}

function Brand({ compact }: { compact?: boolean }) {
  const c = useColors();
  return (
    <Pressable
      onPress={() => go("/")}
      accessibilityRole="link"
      accessibilityLabel="Sonny"
      style={(st: PressState) => [styles.brand, st.focused && focusRing(c)]}
    >
      <Wordmark size={compact ? 34 : 46} />
    </Pressable>
  );
}

/** Interruptor claro / oscuro (barra superior, en la computadora y en el celular). */
function ThemeSwitch() {
  const c = useColors();
  const t = useT();
  const { settings, update } = useSettings();
  const dark = settings.theme === "dark";
  return (
    <Pressable
      onPress={() => update({ theme: dark ? "light" : "dark" })}
      accessibilityRole="switch"
      accessibilityState={{ checked: dark }}
      accessibilityLabel={t("themeDark")}
      hitSlop={8}
      style={(st: PressState) => [
        { width: 76, height: 40, borderRadius: 20, backgroundColor: c.soft, borderWidth: 1, borderColor: c.line, justifyContent: "center" },
        st.focused && focusRing(c),
      ]}
    >
      <View style={{ position: "absolute", left: 9, top: 9 }}>
        <Icon name="sun" size={20} color={c.ink2} />
      </View>
      <View style={{ position: "absolute", right: 9, top: 9 }}>
        <Icon name="moon" size={20} color={c.ink2} />
      </View>
      <View
        style={{
          position: "absolute",
          left: dark ? 39 : 3,
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: dark ? c.primary : c.surface,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.18,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 },
          elevation: 2,
        }}
      >
        <Icon name={dark ? "moon" : "sun"} size={20} color={dark ? c.primaryInk : c.gold} />
      </View>
    </Pressable>
  );
}

/** Menú de la computadora: pestañas con icono y texto en la barra superior. */
function TopMenu() {
  const c = useColors();
  const t = useT();
  const active = useActive();
  return (
    <View style={{ flexDirection: "row", gap: 6 }} accessibilityRole="menubar" accessibilityLabel={t("menuLabel")}>
      {NAV.map((n) => {
        const on = n.key === active;
        return (
          <Pressable
            key={n.key}
            onPress={() => go(n.href)}
            accessibilityRole="menuitem"
            accessibilityState={{ selected: on }}
            style={(st: PressState) => [
              styles.topItem,
              { backgroundColor: on ? c.brand : st.hovered ? c.soft : "transparent" },
              st.focused && focusRing(c),
            ]}
          >
            <Icon name={n.icon} size={24} color={on ? c.brandInk : c.ink} />
            <Txt bold style={{ color: on ? c.brandInk : c.ink, fontSize: size.body - 1 }}>
              {t(n.key)}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Menú del celular: cuatro pestañas grandes abajo, siempre a la vista. */
function TabBar() {
  const c = useColors();
  const t = useT();
  const active = useActive();
  return (
    <View style={[styles.tabBar, { backgroundColor: c.surface, borderTopColor: c.line }]} accessibilityRole="tablist" accessibilityLabel={t("menuLabel")}>
      {NAV.map((n) => {
        const on = n.key === active;
        return (
          <Pressable
            key={n.key}
            onPress={() => go(n.href)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={(st: PressState) => [styles.tab, st.focused && focusRing(c, -2)]}
          >
            <View style={[styles.tabPill, { backgroundColor: on ? c.brand : "transparent" }]}>
              <Icon name={n.icon} size={26} color={on ? c.brandInk : c.ink2} />
            </View>
            <Txt bold={on} numberOfLines={1} style={{ fontSize: 15, lineHeight: 19, color: on ? c.ink : c.ink2 }}>
              {t(n.key)}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

function BackButton() {
  const c = useColors();
  const t = useT();
  return (
    <Pressable
      onPress={goBack}
      accessibilityRole="button"
      accessibilityLabel={t("backShort")}
      hitSlop={12}
      style={(st: PressState) => [styles.backBtn, st.focused && focusRing(c)]}
    >
      <Icon name="back" color={c.primary} size={26} />
      <Txt style={{ color: c.primary, fontSize: size.body }} bold>
        {t("backShort")}
      </Txt>
    </Pressable>
  );
}

/* ───────────── Pantalla ───────────── */

/**
 * width "read": una columna cómoda (760 px). width "wide": hasta 1180 px para dos columnas.
 * bare: sin menú (bienvenida). back: botón Volver (en la computadora, arriba del contenido).
 */
export function Screen({
  children,
  back = false,
  width = "read",
  bare = false,
}: {
  children: ReactNode;
  back?: boolean;
  width?: "read" | "wide";
  bare?: boolean;
}) {
  const c = useColors();
  const wide = useWide();
  const maxWidth = width === "wide" ? size.maxWide : size.maxWidth;
  useFocusEffect(useCallback(() => screenReady(), [])); // la página ya se ve: quita el esqueleto de carga

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top", "left", "right", ...(wide || bare ? (["bottom"] as const) : [])]}>
      <View style={[styles.bar, { borderBottomColor: c.line, backgroundColor: c.surface }]}>
        <View style={[styles.barInner, { maxWidth: size.maxWide + 64, minHeight: wide ? 80 : 60, paddingHorizontal: wide ? 32 : 16 }]}>
          {back && !wide ? <BackButton /> : <Brand compact={!wide} />}
          <View style={{ flexDirection: "row", alignItems: "center", gap: wide ? 20 : 12 }}>
            {wide && !bare && <TopMenu />}
            <ThemeSwitch />
          </View>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: wide ? 32 : 16, paddingTop: wide ? 28 : 12, paddingBottom: wide ? 40 : 12 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.column, { maxWidth, gap: wide ? 20 : 12 }]}>
          {back && wide && <BackButton />}
          {children}
        </View>
      </ScrollView>
      {!wide && !bare && (
        <SafeAreaView edges={["bottom"]} style={{ backgroundColor: c.surface }}>
          <TabBar />
        </SafeAreaView>
      )}
    </SafeAreaView>
  );
}

/** Dos columnas en la computadora, una debajo de otra en el celular. */
export function Columns({
  children,
  gap = 28,
  align = "flex-start",
  ratio = [1, 1],
}: {
  children: [ReactNode, ReactNode];
  gap?: number;
  align?: ViewStyle["alignItems"];
  ratio?: [number, number];
}) {
  const wide = useWide();
  if (!wide) return <View style={{ gap: 14 }}>{children}</View>;
  return (
    <View style={{ flexDirection: "row", gap, alignItems: align }}>
      <View style={{ flex: ratio[0], gap: 18, minWidth: 0 }}>{children[0]}</View>
      <View style={{ flex: ratio[1], gap: 18, minWidth: 0 }}>{children[1]}</View>
    </View>
  );
}

/* ───────────── Texto ───────────── */

export function Txt({
  children,
  style,
  bold,
  muted,
  numberOfLines,
}: {
  children: ReactNode;
  style?: TextStyle | TextStyle[];
  bold?: boolean;
  muted?: boolean;
  numberOfLines?: number;
}) {
  const c = useColors();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[{ fontFamily: bold ? font.bold : font.regular, color: muted ? c.ink2 : c.ink, fontSize: size.body, lineHeight: size.body * 1.45 }, style]}
    >
      {children}
    </Text>
  );
}

/** Titular en Fredoka: la voz de la marca. */
export function Display({ children, style, level = "title" }: { children: ReactNode; style?: TextStyle; level?: "title" | "headline" | "hero" }) {
  const c = useColors();
  const wide = useWide();
  const fs = level === "hero" ? (wide ? size.hero : 36) : level === "headline" ? (wide ? size.headline : 30) : wide ? size.title + 4 : size.title;
  return (
    <Text accessibilityRole="header" style={[{ fontFamily: font.display, fontSize: fs, lineHeight: fs * 1.12, color: c.ink }, style]}>
      {children}
    </Text>
  );
}

export const Title = ({ children, style }: { children: ReactNode; style?: TextStyle }) => <Display style={style}>{children}</Display>;

export const Body = ({ children, style, muted }: { children: ReactNode; style?: TextStyle; muted?: boolean }) => (
  <Txt style={style} muted={muted}>
    {children}
  </Txt>
);

export const Small = ({ children, style }: { children: ReactNode; style?: TextStyle }) => (
  <Txt muted style={[{ fontSize: size.small, lineHeight: size.small * 1.45 }, style ?? {}]}>
    {children}
  </Txt>
);

/* ───────────── Botones ───────────── */

type Kind = "primary" | "soft" | "quiet" | "brand";

export function ActionButton({
  label,
  onPress,
  icon,
  kind = "primary",
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  kind?: Kind;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const c = useColors();
  const fg = kind === "primary" ? c.primaryInk : kind === "soft" ? c.softInk : kind === "brand" ? c.brandInk : c.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={(st: PressState) => [
        styles.button,
        kind === "primary" && { backgroundColor: st.pressed || st.hovered ? c.primaryPressed : c.primary },
        kind === "soft" && { backgroundColor: c.soft },
        kind === "brand" && { backgroundColor: c.brand },
        kind === "quiet" && { backgroundColor: "transparent", borderWidth: 2, borderColor: c.line },
        { opacity: disabled ? 0.5 : st.pressed && kind !== "primary" ? 0.8 : 1 },
        st.focused && focusRing(c),
        style,
      ]}
    >
      {icon && <Icon name={icon} color={fg} size={28} />}
      <Txt bold style={{ color: fg, fontSize: size.button, lineHeight: size.button * 1.3, flexShrink: 1, textAlign: "center" }}>
        {label}
      </Txt>
    </Pressable>
  );
}

/** Dos botones del mismo peso, lado a lado. */
export function ButtonRow({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "row", gap: 12 }}>{children}</View>;
}
export const half: ViewStyle = { flex: 1, width: undefined, paddingHorizontal: 10 };

export function TextLink({ label, onPress, icon }: { label: string; onPress: () => void; icon?: IconName }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={label}
      hitSlop={8}
      style={(st: PressState) => [styles.link, st.focused && focusRing(c)]}
    >
      {icon && <Icon name={icon} color={c.primary} size={24} />}
      <Txt bold style={{ color: c.primary, fontSize: size.body, textDecorationLine: "underline" }}>
        {label}
      </Txt>
    </Pressable>
  );
}

/* ───────────── Conversación ───────────── */

/** Lo que dice Sonny: avatar + burbuja azul cielo a la izquierda. */
export function SonnySays({ children, mood, avatar = 56 }: { children: ReactNode; mood?: Mood; avatar?: number }) {
  const c = useColors();
  return (
    <View style={styles.sonnyRow}>
      <SonnyAvatar size={avatar} mood={mood} />
      <View style={[styles.bubble, { backgroundColor: c.sonnyBubble, borderTopLeftRadius: 8 }]}>{children}</View>
    </View>
  );
}

/** El mensaje que trae el usuario, como un mensaje reenviado a la derecha. */
export function ForwardedMessage({ text, label, lines = 4 }: { text: string; label: string; lines?: number }) {
  const c = useColors();
  return (
    <View style={[styles.forwarded, { backgroundColor: c.userBubble, borderColor: c.line }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Icon name="forward" size={18} color={c.ink2} />
        <Small style={{ fontSize: 16 }}>{label}</Small>
      </View>
      <Txt numberOfLines={lines} style={{ fontSize: size.small + 1, lineHeight: (size.small + 1) * 1.4 }}>
        {text}
      </Txt>
    </View>
  );
}

function verdictColors(v: Verdict, c: Colors) {
  return v === "scam" ? { fg: c.scam, bg: c.scamBg } : v === "suspicious" ? { fg: c.warn, bg: c.warnBg } : { fg: c.safe, bg: c.safeBg };
}

function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

/**
 * La respuesta de Sonny: el elemento memorable. Franja de color con el veredicto y una frase grande.
 * Única animación: aparece una vez, suave (se omite con "reducir movimiento").
 */
export function VerdictBubble({ verdict, label, headline, reason }: { verdict: Verdict; label: string; headline: string; reason: string }) {
  const c = useColors();
  const wide = useWide();
  const dark = useIsDark();
  const { fg, bg } = verdictColors(verdict, c);
  const bandInk = dark ? "#0E1829" : "#FFFFFF";
  const reduce = useReduceMotion();
  const [anim] = useState(() => new Animated.Value(0)); // se crea una vez
  useEffect(() => {
    if (reduce) {
      anim.setValue(1);
      return;
    }
    Animated.timing(anim, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }, [anim, reduce]);
  const hs = wide ? 46 : 32;
  const rs = wide ? size.lead : size.body;

  return (
    <Animated.View
      accessibilityRole="summary"
      accessibilityLabel={`${label}. ${headline} ${reason}`}
      style={[
        styles.verdict,
        { backgroundColor: bg, borderColor: fg },
        {
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
            { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
          ],
        },
      ]}
    >
      <View style={[styles.band, { backgroundColor: fg }]}>
        <Icon name={verdict} size={34} color={bandInk} inner={fg} />
        <Text style={{ fontFamily: font.display, color: bandInk, fontSize: wide ? 30 : 26, lineHeight: wide ? 38 : 34, marginTop: 3 }}>{label}</Text>
      </View>
      <View style={{ paddingHorizontal: wide ? 26 : 18, paddingTop: 12, paddingBottom: wide ? 24 : 16, gap: 6 }}>
        <Text style={{ fontFamily: font.display, fontSize: hs, lineHeight: hs * 1.12, color: c.ink }}>{headline}</Text>
        <Txt style={{ fontSize: rs, lineHeight: rs * 1.4 }}>{reason}</Txt>
      </View>
    </Animated.View>
  );
}

/** Mientras analiza: Sonny pensando, con una frase fija y tranquila. */
export function SonnyThinking({ text }: { text: string }) {
  return (
    <View accessibilityLiveRegion="polite">
      <SonnySays mood="thinking" avatar={76}>
        <Txt bold style={{ fontSize: size.lead - 2 }}>
          {text}
        </Txt>
      </SonnySays>
    </View>
  );
}

/* ───────────── Bloques ───────────── */

/** Superficie para agrupar. tone "brand": bloque azul cielo; "hero": bloque principal azul marino. */
export function Panel({ children, style, tone = "plain" }: { children: ReactNode; style?: ViewStyle; tone?: "plain" | "brand" | "hero" | "soft" }) {
  const c = useColors();
  const wide = useWide();
  const bg = tone === "brand" ? c.brand : tone === "hero" ? c.hero : tone === "soft" ? c.soft : c.surface;
  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: bg, borderColor: tone === "plain" ? c.line : bg, padding: wide ? 22 : 16, gap: wide ? 12 : 10 },
        tone === "hero" && { overflow: "hidden" },
        style,
      ]}
    >
      {tone === "hero" && <HeroBackground from={c.hero} to={c.heroTo} />}
      {children}
    </View>
  );
}

/** Degradado diagonal del bloque principal (denim arriba a la izquierda, marino abajo a la derecha). */
function HeroBackground({ from, to }: { from: string; to: string }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="sonnyHero" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#sonnyHero)" />
      </Svg>
    </View>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" }) {
  const c = useColors();
  return (
    <View style={[styles.notice, { backgroundColor: tone === "warn" ? c.warnBg : c.soft }]}>
      <Txt style={{ fontSize: size.small, lineHeight: size.small * 1.4 }}>{children}</Txt>
    </View>
  );
}

export function Gap({ h = size.gap }: { h?: number }) {
  return <View style={{ height: h }} />;
}

export function useVerdictColors(v: Verdict) {
  return verdictColors(v, useColors());
}

const styles = StyleSheet.create({
  bar: { borderBottomWidth: 1 },
  barInner: { width: "100%", alignSelf: "center", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 },
  brand: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, paddingVertical: 4 },
  topItem: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 52, paddingHorizontal: 18, borderRadius: 26 },
  tabBar: { flexDirection: "row", borderTopWidth: 1, paddingTop: 6, paddingBottom: 6 },
  tab: { flex: 1, alignItems: "center", gap: 2, minHeight: 64, justifyContent: "center", borderRadius: 12 },
  tabPill: { width: 60, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 48, paddingRight: 8, borderRadius: 10, alignSelf: "flex-start" },
  scroll: { flexGrow: 1 },
  column: { width: "100%", alignSelf: "center" },
  button: { minHeight: size.buttonHeight, borderRadius: size.radius, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 20, paddingVertical: 12, width: "100%" },
  link: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 48, alignSelf: "flex-start", borderRadius: 8 },
  sonnyRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  bubble: { flex: 1, borderRadius: size.bubbleRadius, paddingHorizontal: 18, paddingVertical: 14, gap: 6 },
  verdict: { borderWidth: 3, borderRadius: size.bubbleRadius, overflow: "hidden" },
  band: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, paddingVertical: 8 },
  forwarded: { alignSelf: "flex-end", maxWidth: "92%", borderWidth: 1, borderRadius: size.bubbleRadius, borderTopRightRadius: 8, paddingHorizontal: 16, paddingVertical: 10, gap: 4 },
  panel: { borderWidth: 1, borderRadius: size.radius + 4 },
  notice: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
});

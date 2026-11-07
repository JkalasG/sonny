// Esqueleto de carga: la forma de cada página (barra, menú, paneles, botones) en bloques que laten suave,
// con el spinner de Sonny (Sonny con la lupa en un anillo que gira, y el wordmark) en el centro,
// mientras la página real aún no está lista.
//   <PageSkeleton>: primera carga (fuentes y ajustes).
//   <NavSkeleton>: al cambiar de página, el esqueleto de la página de destino si el cambio tarda más de
//   SHOW_AFTER_MS (no parpadea en cambios rápidos); se quita cuando la nueva <Screen> recibe el foco y,
//   una vez visible, se queda al menos MIN_VISIBLE_MS.
// Copia las medidas de ui.tsx (barra 80/60 px, botones 64 px, paneles con radio 24) para que al llegar
// el contenido real no haya saltos. Con "reducir movimiento" los bloques no laten.

import { usePathname } from "expo-router";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View, type DimensionValue, type ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";

import { onNavStart, onScreenReady, setCurrentPath } from "../lib/nav";
import { size, useColors, useWide } from "../lib/theme";
import { SonnyAvatar, Wordmark } from "./SonnyAvatar";

/* ───────────── Pulso compartido ───────────── */

const Pulse = createContext<Animated.Value | number>(1);

function usePulse(): Animated.Value | number {
  const [v] = useState(() => new Animated.Value(1));
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
  }, []);
  useEffect(() => {
    if (reduce) return;
    const native = Platform.OS !== "web";
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 0.55, duration: 750, useNativeDriver: native }),
        Animated.timing(v, { toValue: 1, duration: 750, useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, reduce]);
  return reduce ? 1 : v;
}

/** Un bloque gris. on: "plain" sobre tarjeta/fondo, "hero" sobre el bloque azul marino. */
function B({ w = "100%", h = 18, r = 10, on = "plain", style }: { w?: DimensionValue; h?: number; r?: number; on?: "plain" | "hero"; style?: ViewStyle }) {
  const c = useColors();
  const opacity = useContext(Pulse);
  return <Animated.View style={[{ width: w, height: h, borderRadius: r, backgroundColor: on === "hero" ? c.heroSoft : c.line, opacity }, style]} />;
}

function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useColors();
  const wide = useWide();
  return (
    <View style={[{ backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: size.radius + 4, padding: wide ? 22 : 16, gap: wide ? 14 : 10 }, style]}>
      {children}
    </View>
  );
}

function Hero({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useColors();
  return <View style={[{ backgroundColor: c.hero, borderRadius: 36, padding: 40, gap: 18 }, style]}>{children}</View>;
}

const Row = ({ children, gap = 12, style }: { children: ReactNode; gap?: number; style?: ViewStyle }) => (
  <View style={[{ flexDirection: "row", gap, alignItems: "center" }, style]}>{children}</View>
);
const Col = ({ children, flex = 1, gap = 18 }: { children: ReactNode; flex?: number; gap?: number }) => (
  <View style={{ flex, gap, minWidth: 0 }}>{children}</View>
);

const Btn = ({ w = "100%" as DimensionValue, flex }: { w?: DimensionValue; flex?: number }) => (
  <B w={flex ? undefined : w} h={size.buttonHeight} r={size.radius} style={flex ? { flex } : undefined} />
);

/** Título de página: una barra gruesa y, si hace falta, una línea fina debajo. */
const PageTitle = ({ sub }: { sub?: boolean }) => (
  <View style={{ gap: 12 }}>
    <B w={320} h={36} r={12} style={{ maxWidth: "80%" }} />
    {sub && <B w={260} h={14} style={{ maxWidth: "70%" }} />}
  </View>
);

/* ───────────── Marco: barra superior, menú y barra de pestañas ───────────── */

function Frame({ children, menu = true, width = "wide" }: { children: ReactNode; menu?: boolean; width?: "wide" | "read" }) {
  const c = useColors();
  const wide = useWide();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top", "left", "right", "bottom"]}>
      <View style={{ borderBottomWidth: 1, borderBottomColor: c.line, backgroundColor: c.surface }}>
        <View
          style={{
            width: "100%",
            maxWidth: size.maxWide + 64,
            alignSelf: "center",
            minHeight: wide ? 80 : 60,
            paddingHorizontal: wide ? 32 : 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <B w={wide ? 145 : 108} h={wide ? 44 : 34} r={14} />
          <Row gap={wide ? 20 : 12}>
            {wide && menu && (
              <Row gap={6}>
                {[118, 136, 140, 116].map((w, i) => (
                  <B key={i} w={w} h={52} r={26} />
                ))}
              </Row>
            )}
            <B w={76} h={40} r={20} />
          </Row>
        </View>
      </View>
      <View style={{ flex: 1, paddingHorizontal: wide ? 32 : 16, paddingTop: wide ? 28 : 12 }}>
        <View style={{ width: "100%", maxWidth: width === "wide" ? size.maxWide : size.maxWidth, alignSelf: "center", gap: wide ? 20 : 12 }}>
          {children}
        </View>
      </View>
      {!wide && menu && (
        <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.surface, paddingVertical: 6 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ flex: 1, alignItems: "center", gap: 6, minHeight: 64, justifyContent: "center" }}>
              <B w={60} h={34} r={17} />
              <B w={52} h={10} r={5} />
            </View>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}


/* ───────────── Spinner de Sonny ───────────── */

function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
  }, []);
  return reduce;
}

export function SonnySpinner({ size: S = 128 }: { size?: number }) {
  const c = useColors();
  const reduce = useReduceMotion();
  const [spin] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: Platform.OS !== "web" }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin, reduce]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const stroke = Math.max(5, Math.round(S / 18));
  const r = S / 2 - stroke / 2;
  const circ = 2 * Math.PI * r;
  return (
    <View style={{ alignItems: "center", gap: 14, backgroundColor: c.surface, borderRadius: 28, paddingVertical: 24, paddingHorizontal: 30, borderWidth: 1, borderColor: c.line, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}>
      <View style={{ width: S, height: S, alignItems: "center", justifyContent: "center" }}>
        <Svg width={S} height={S} style={StyleSheet.absoluteFill}>
          <Circle cx={S / 2} cy={S / 2} r={r} stroke={c.soft} strokeWidth={stroke} fill="none" />
        </Svg>
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}>
          <Svg width={S} height={S}>
            {/* arco denim + punta dorada (el escudo del logo) */}
            <Circle cx={S / 2} cy={S / 2} r={r} stroke={c.primary} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${circ * 0.3} ${circ}`} />
            <Circle cx={S / 2} cy={S / 2} r={r} stroke={c.gold} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`0.1 ${circ}`} />
          </Svg>
        </Animated.View>
        <SonnyAvatar size={Math.max(100, S - stroke * 2 - 14)} mood="thinking" ring={false} />
      </View>
      <Wordmark size={Math.round(S / 4.6)} />
    </View>
  );
}

/* ───────────── Una por página ───────────── */

function HomeSkeleton() {
  const wide = useWide();
  const card = (
    <Card>
      <B w="60%" h={30} r={12} />
      <B h={wide ? 168 : 100} r={18} />
      <Row>
        <Btn flex={1} />
        <Btn flex={1} />
      </Row>
      <B h={2} r={1} style={{ marginVertical: 6 }} />
      <Btn />
    </Card>
  );
  if (!wide) {
    return (
      <Frame>
        <Row gap={12} style={{ alignItems: "flex-start" }}>
          <B w={64} h={64} r={32} />
          <B h={150} r={size.bubbleRadius} style={{ flex: 1 }} />
        </Row>
        {card}
      </Frame>
    );
  }
  return (
    <Frame>
      <Row gap={32} style={{ alignItems: "stretch" }}>
        <Col flex={1.05}>
          <Hero>
            <Row gap={28}>
              <B w={210} h={210} r={105} on="hero" />
              <View style={{ flex: 1, gap: 12 }}>
                {[0, 1, 2].map((i) => (
                  <B key={i} h={52} r={16} on="hero" />
                ))}
              </View>
            </Row>
            <B w="85%" h={52} r={14} on="hero" />
            <B w="55%" h={52} r={14} on="hero" />
            <B w="90%" h={20} on="hero" />
            <B w="60%" h={20} on="hero" />
          </Hero>
        </Col>
        <Col>
          {card}
          <B w="85%" h={14} />
        </Col>
      </Row>
    </Frame>
  );
}

function ExamplesSkeleton() {
  const wide = useWide();
  const list = (n: number) => (
    <Card>
      <B w={110} h={20} />
      {Array.from({ length: n }, (_, i) => (
        <View key={i} style={{ borderRadius: 18, padding: 16, gap: 10, borderWidth: 1, borderColor: "transparent" }}>
          <B w="35%" h={14} />
          <B w="95%" h={16} />
          <B w="60%" h={16} />
        </View>
      ))}
    </Card>
  );
  return (
    <Frame>
      <PageTitle sub />
      {wide ? (
        <Row gap={28} style={{ alignItems: "flex-start" }}>
          <Col>{list(4)}</Col>
          <Col>{list(4)}</Col>
        </Row>
      ) : (
        list(4)
      )}
    </Frame>
  );
}

function ModelSkeleton() {
  const c = useColors();
  const wide = useWide();
  const bars = (
    <View style={{ backgroundColor: c.brand, borderRadius: 32, padding: wide ? 30 : 20, gap: 16 }}>
      <B w="55%" h={30} r={12} style={{ backgroundColor: "#FFFFFF66" }} />
      {[0, 1].map((i) => (
        <View key={i} style={{ backgroundColor: "#FFFFFF55", borderRadius: 20, padding: 16, gap: 12 }}>
          <B w="30%" h={16} style={{ backgroundColor: "#FFFFFF88" }} />
          <B h={14} style={{ backgroundColor: "#FFFFFF88" }} />
          <B h={14} style={{ backgroundColor: "#FFFFFF88" }} />
        </View>
      ))}
    </View>
  );
  const chart = (
    <Card style={{ flex: 1 }}>
      <B w="50%" h={20} />
      <B h={wide ? 220 : 160} r={14} />
    </Card>
  );
  return (
    <Frame>
      <PageTitle sub />
      {wide ? (
        <Row gap={28} style={{ alignItems: "flex-start" }}>
          <Col flex={1.2}>{chart}</Col>
          <Col>{bars}</Col>
        </Row>
      ) : (
        <>
          {bars}
          {chart}
        </>
      )}
    </Frame>
  );
}

function SettingsSkeleton() {
  const wide = useWide();
  const choice = (key: number) => (
    <Card key={key} style={wide ? { flexGrow: 1, flexBasis: 420 } : undefined}>
      <B w="40%" h={18} />
      <Row>
        <Btn flex={1} />
        <Btn flex={1} />
      </Row>
    </Card>
  );
  return (
    <Frame>
      <PageTitle />
      <View style={{ flexDirection: wide ? "row" : "column", flexWrap: wide ? "wrap" : "nowrap", gap: wide ? 20 : 14 }}>{[0, 1, 2, 3, 4].map(choice)}</View>
    </Frame>
  );
}

function ResultSkeleton() {
  const c = useColors();
  const wide = useWide();
  const verdict = (
    <View style={{ borderWidth: 3, borderColor: c.line, borderRadius: size.bubbleRadius, overflow: "hidden" }}>
      <B h={52} r={0} />
      <View style={{ padding: 20, gap: 12, backgroundColor: c.surface }}>
        <B w="80%" h={40} r={12} />
        <B w="95%" h={18} />
        <B w="60%" h={18} />
      </View>
    </View>
  );
  const actions = (
    <>
      <Btn />
      <Btn />
      <B w={220} h={20} />
    </>
  );
  const forwarded = <B w="85%" h={wide ? 120 : 80} r={size.bubbleRadius} style={{ alignSelf: "flex-end" }} />;
  return (
    <Frame>
      <B w={110} h={28} />
      {wide ? (
        <Row gap={36} style={{ alignItems: "flex-start" }}>
          <Col flex={0.8}>
            {forwarded}
            <View style={{ alignItems: "center", gap: 14 }}>
              <B w={190} h={190} r={95} />
              <B w="70%" h={20} />
              <B w="85%" h={14} />
            </View>
          </Col>
          <Col flex={1.2}>
            {verdict}
            {actions}
          </Col>
        </Row>
      ) : (
        <>
          {forwarded}
          <Row style={{ alignItems: "flex-start" }}>
            <B w={48} h={48} r={24} />
            <View style={{ flex: 1 }}>{verdict}</View>
          </Row>
          {actions}
        </>
      )}
    </Frame>
  );
}

function WelcomeSkeleton() {
  const wide = useWide();
  const choices = (
    <Card style={{ padding: 32 }}>
      <B w="50%" h={20} />
      <Row>
        <Btn flex={1} />
        <Btn flex={1} />
      </Row>
      <Btn />
    </Card>
  );
  if (!wide) {
    return (
      <Frame menu={false}>
        <View style={{ alignItems: "center", gap: 12 }}>
          <B w={124} h={124} r={62} />
          <B w="70%" h={34} r={12} />
          <B w="90%" h={16} />
        </View>
        {choices}
      </Frame>
    );
  }
  return (
    <Frame menu={false}>
      <Row gap={36}>
        <Col flex={1.1}>
          <Hero style={{ padding: 44 }}>
            <B w={250} h={250} r={125} on="hero" />
            <B w="70%" h={56} r={14} on="hero" />
            <B w="90%" h={20} on="hero" />
            <B w="60%" h={20} on="hero" />
          </Hero>
        </Col>
        <Col>{choices}</Col>
      </Row>
    </Frame>
  );
}

const BY_PATH: Record<string, () => ReactNode> = {
  "/": HomeSkeleton,
  "/examples": ExamplesSkeleton,
  "/model": ModelSkeleton,
  "/settings": SettingsSkeleton,
  "/result": ResultSkeleton,
  "/steps": ResultSkeleton,
  "/why": ResultSkeleton,
  "/welcome": WelcomeSkeleton,
};

// Ya se montó la app en el navegador: los esqueletos siguientes (al cambiar de página) se pintan directo.
// Lo marca el layout raíz al montarse.
let hydrated = false;

export function markHydrated() {
  hydrated = true;
}

/** El esqueleto de la página que se está abriendo (según la ruta). */
export function PageSkeleton({ path: forPath }: { path?: string | null } = {}) {
  const c = useColors();
  const current = usePathname();
  const path = forPath ?? current;
  const pulse = usePulse();
  // El servidor no sabe el ancho de la pantalla: hasta montar en el navegador solo se pinta el fondo,
  // igual en los dos lados (si no, React rechaza la hidratación por diferencias de diseño).
  const [mounted, setMounted] = useState(hydrated);
  useEffect(() => {
    if (mounted) return;
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, [mounted]);
  if (!mounted) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  const Page = BY_PATH[path] ?? HomeSkeleton;
  return (
    <Pulse.Provider value={pulse}>
      <View style={{ flex: 1 }} accessible accessibilityRole="progressbar" accessibilityLabel="Sonny" accessibilityLiveRegion="polite">
        <Page />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
          <SonnySpinner />
        </View>
      </View>
    </Pulse.Provider>
  );
}

/* ───────────── Al cambiar de página ───────────── */

const SHOW_AFTER_MS = 120;
const MIN_VISIBLE_MS = 350;
const MAX_WAIT_MS = 6000; // por si la página nueva nunca avisa

/** Capa con el esqueleto de la página de destino. Va una sola vez, en el layout raíz. */
export function NavSkeleton() {
  const path = usePathname();
  const [target, setTarget] = useState<string | null | undefined>(undefined); // undefined = oculto
  const st = useRef({ pending: false, shownAt: 0, timers: [] as ReturnType<typeof setTimeout>[] });

  useEffect(() => setCurrentPath(path), [path]);

  useEffect(() => {
    const s = st.current;
    const clear = () => {
      s.timers.forEach(clearTimeout);
      s.timers = [];
    };
    const hide = () => {
      s.pending = false;
      clear();
      if (!s.shownAt) return;
      const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - s.shownAt));
      s.timers.push(
        setTimeout(() => {
          s.shownAt = 0;
          setTarget(undefined);
        }, wait),
      );
    };
    const offStart = onNavStart((to) => {
      clear();
      s.pending = true;
      s.timers.push(
        setTimeout(() => {
          if (!s.pending) return;
          s.shownAt = Date.now();
          setTarget(to);
        }, SHOW_AFTER_MS),
        setTimeout(hide, MAX_WAIT_MS),
      );
    });
    const offReady = onScreenReady(() => {
      if (s.pending || s.shownAt) requestAnimationFrame(hide);
    });
    return () => {
      offStart();
      offReady();
      clear();
    };
  }, []);

  if (target === undefined) return null;
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]}>
      <PageSkeleton path={target ?? path} />
    </View>
  );
}

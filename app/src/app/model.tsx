// Página de resultados del modelo (especificación: nogit/pagina_resultados.md), con el tema de la app.
// La portada es la demo en vivo: los modelos reales en el navegador, sin servidor.
// Todas las cifras salen de assets/report/analisis.json (modelo/06_analisis.py -> npm run sync-model).

import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";

import { Icon } from "../components/Icon";
import { ActionButton, Columns, Display, Panel, Screen, Small, SonnySays, Title, Txt, useVerdictColors } from "../components/ui";
import { explainWords, loadModel } from "../lib/model";
import { useSettings, type Lang } from "../lib/settings";
import { detectLang, scoreMessage, type SonnyModel } from "../lib/sonny/scorer";
import type { Verdict } from "../lib/templates";
import { font, size, useColors, useWide, type Colors } from "../lib/theme";

const R = require("../../assets/report/analisis.json") as Report;
const BEFORE = require("../../assets/report/invisibles_antes.json") as Record<"en" | "es", { recall_before: number; recall_after: number }>;

type CI = { value: number; lo: number; hi: number };
type M = { precision: number; recall: number; f1: number; auc: number | null };
type PerLang = {
  bootstrap: Record<"precision" | "recall" | "f1" | "auc", CI>;
  baselines: Record<string, M>;
  learning: { n: number; f1: number }[];
  ngrams: [[string, number][], [string, number][]];
  cascade: { kept_on_device: number; offline: Record<"scam" | "legit", Record<Verdict, number>> };
  robustness: { name: string; verdict_changed: number; recall_after: number }[];
  cross_source: { train: string; test: string; auc: number }[];
};
type Report = {
  en: PerLang;
  es: PerLang;
  cross_lingual: Record<string, M>;
  js: { models: Record<string, { mb: number; median_ms: number; load_ms: number }> };
};

const LANGS = ["en", "es"] as const;
const ZWNJ = String.fromCodePoint(0x200c); // carácter invisible del ataque
const pct = (x: number, d = 1) => `${(100 * x).toFixed(d)} %`;

const L = {
  title: { en: "How well does Sonny work?", es: "¿Qué tan bien funciona Sonny?" },
  intro: {
    en: "Try the model we trained ourselves. It runs right here, offline, exactly as in the app. Your text never leaves this page.",
    es: "Prueba el modelo que entrenamos nosotros. Funciona aquí mismo, sin internet, igual que en la app. Tu texto no sale de esta página.",
  },
  placeholder: { en: "Type or paste a message", es: "Escribe o pega un mensaje" },
  attack: { en: "Try the invisible-character attack", es: "Probar el ataque de caracteres invisibles" },
  attackOn: {
    en: "Invisible characters inserted every 3 letters. Same score: the attack does nothing.",
    es: "Caracteres invisibles cada 3 letras. Misma puntuación: el ataque no hace nada.",
  },
  langDetected: { en: "Language detected", es: "Idioma detectado" },
  unsure: { en: "unsure, so it uses your language", es: "dudoso, se usa tu idioma" },
  onlyModel: {
    en: "This shows only the on-device model. The app also checks links with rules and, when online and unsure, asks an AI for a second opinion.",
    es: "Aquí solo se ve el modelo del celular. La app además revisa los enlaces y, con internet y en caso de duda, pide una segunda opinión a una IA.",
  },
  quality: { en: "Detection on held-out messages", es: "Detección en mensajes de prueba" },
  caught: { en: "Scams caught", es: "Estafas detectadas" },
  precision: { en: "Of the messages it flags, real scams", es: "De lo que marca, estafas reales" },
  ci: { en: "95% confidence for scams caught", es: "Confianza del 95 % para estafas detectadas" },
  vs: { en: "Compared with other approaches", es: "Frente a otras formas de hacerlo" },
  vsNote: { en: "F1 score: higher is better. Sonny in color.", es: "Puntuación F1: más alto es mejor. Sonny en color." },
  offline: { en: "What it says with no internet", es: "Lo que dice sin internet" },
  scams: { en: "Real scams", es: "Estafas reales" },
  legit: { en: "Normal messages", es: "Mensajes normales" },
  kept: { en: "of messages are clear scams that never leave the phone", es: "de los mensajes son estafas claras que nunca salen del celular" },
  attackTitle: { en: "The attack we found and fixed", es: "El ataque que encontramos y arreglamos" },
  attackText: {
    en: "Scammers hide invisible characters inside words to dodge filters. Our tests found it cut Spanish detection from 92% to 57%. Now the app removes those characters before analyzing, and an automated test guards it.",
    es: "Los estafadores esconden caracteres invisibles dentro de las palabras para esquivar filtros. Nuestras pruebas vieron que la detección en español bajaba del 92 % al 57 %. Ahora la app los quita antes de analizar, y una prueba automática lo vigila.",
  },
  noAttack: { en: "No attack", es: "Sin ataque" },
  before: { en: "With attack, before the fix", es: "Con ataque, antes del arreglo" },
  after: { en: "With attack, after the fix", es: "Con ataque, después del arreglo" },
  robust: { en: "Does it get fooled easily?", es: "¿Se deja engañar fácil?" },
  robustNote: { en: "Share of verdicts that change when the message is altered.", es: "Parte de los veredictos que cambian al alterar el mensaje." },
  learned: { en: "What it pays attention to", es: "En qué se fija" },
  learnedNote: {
    en: "Pieces of text that push towards scam (orange) or normal (blue). The Spanish model learned a shortcut from its data: formal \"su\" points to scam and informal \"tu\" to normal.",
    es: "Trozos de texto que empujan hacia estafa (naranja) o hacia normal (azul). El modelo español aprendió un atajo de sus datos: \"su\" apunta a estafa y \"tu\" a normal.",
  },
  learning: { en: "More data would help Spanish", es: "Más datos ayudarían al español" },
  learningNote: { en: "F1 on test messages as training data grows.", es: "F1 en mensajes de prueba según crecen los datos de entrenamiento." },
  limits: { en: "Honest limits", es: "Límites honestos" },
  speed: { en: "Speed and size", es: "Velocidad y tamaño" },
  perMsg: { en: "per message", es: "por mensaje" },
  testsCount: {
    en: "35 automated tests (18 in JavaScript, 17 in Python) check that the app computes exactly what Python computes.",
    es: "35 pruebas automáticas (18 en JavaScript, 17 en Python) comprueban que la app calcula exactamente lo mismo que Python.",
  },
  data: { en: "Datasets and licenses", es: "Datos y licencias" },
  tests: { en: "The tests, one by one", es: "Las pruebas, una por una" },
  figures: { en: "Charts from the analysis", es: "Gráficos del análisis" },
  figuresNote: {
    en: "The original charts generated by modelo/06_analisis.py, the same ones in ANALISIS_MODELO.md.",
    es: "Los gráficos originales que genera modelo/06_analisis.py, los mismos de ANALISIS_MODELO.md.",
  },
  verdict: { scam: { en: "Scam", es: "Estafa" }, suspicious: { en: "Wait", es: "Dudoso" }, safe: { en: "Looks normal", es: "Parece normal" } },
} as const;

const summary = (lang: Lang, en: string, es: string, safe: string) =>
  lang === "en"
    ? `On messages it never saw, it catches ${en} of English scams and ${es} of Spanish scams. With no internet, ${safe} scams were shown as "looks normal".`
    : `En mensajes que nunca vio, detecta el ${en} de las estafas en inglés y el ${es} en español. Sin internet, ${safe} estafas salieron como "parece normal".`;

const ROBUST_NAMES: Record<string, { en: string; es: string }> = {
  "TODO EN MAYÚSCULAS": { en: "ALL CAPS", es: "Todo en mayúsculas" },
  "Sin tildes ni eñes": { en: "No accents", es: "Sin tildes ni eñes" },
  "Errores de tipeo (1 de cada 10 palabras)": { en: "Typos (1 in 10 words)", es: "Errores de tipeo (1 de cada 10 palabras)" },
  "Espacios y saltos de línea extra": { en: "Extra spaces and line breaks", es: "Espacios y saltos de línea extra" },
  "Emojis al final": { en: "Emojis added", es: "Emojis al final" },
  "Otro enlace (cambia el dominio)": { en: "Different link", es: "Otro enlace" },
  "Caracteres invisibles insertados": { en: "Invisible characters", es: "Caracteres invisibles" },
  "Números cambiados": { en: "Different numbers", es: "Números cambiados" },
  "Mensaje recortado a la mitad": { en: "Message cut in half", es: "Mensaje recortado a la mitad" },
  "Ofuscación l33t (o→0, e→3, a→4, i→1)": { en: "l33t spelling (o→0, e→3)", es: "Escritura l33t (o→0, e→3)" },
};

const BASELINE_NAMES: Record<string, { en: string; es: string }> = {
  'Siempre "legítimo"': { en: "Always say normal", es: "Decir siempre normal" },
  "Lista de palabras clave": { en: "Keyword list", es: "Lista de palabras clave" },
  "TF-IDF de palabras + regresión logística": { en: "Whole words", es: "Palabras completas" },
  "N-gramas de caracteres + Naive Bayes": { en: "Letter groups, Naive Bayes", es: "Grupos de letras, Naive Bayes" },
  "**Sonny** (n-gramas de caracteres + regresión logística)": { en: "Sonny", es: "Sonny" },
};

const DEMO_CHIPS = [
  "Felicidades, ha ganado un iPhone. Reclámelo hoy aquí: premios-ya.top",
  "Recordatorio de su cita el día 12 a las 10:00 en el consultorio",
  "Tiene una multa de tránsito pendiente. Pague antes de 24 horas: multas-pago.click",
  "Your bank account has been locked. Verify your details here: bank-verify.xyz",
  "Are you coming for dinner on Sunday?",
];

function limits(lang: Lang): string[] {
  const xs = R.es.cross_source.find((r) => r.train !== r.test)?.auc.toFixed(2);
  const a = R.cross_lingual["en->es"].auc?.toFixed(2);
  const b = R.cross_lingual["es->en"].auc?.toFixed(2);
  return lang === "en"
    ? [
        `The Spanish model doesn't carry over between styles: trained on text messages and tested on emails, it's no better than chance (AUC ${xs}).`,
        `The "family member in trouble" scam ("Hi mom, I broke my phone…") is shown as normal with no internet. No public dataset contains it.`,
        `Each model is no better than chance on the other language (AUC ${a} and ${b}), which is why there are two models and a language detector.`,
        "l33t spelling (o→0, e→3) lowers Spanish detection, but no scam turns into \"looks normal\".",
      ]
    : [
        `El modelo español no se adapta entre estilos: entrenado con SMS y probado con correos, acierta como el azar (AUC ${xs}).`,
        `La estafa del "familiar en apuros" ("Hola mamá, se me rompió el celular…") sale como normal sin internet. Ningún dataset público la incluye.`,
        `Cada modelo acierta como el azar con el otro idioma (AUC ${a} y ${b}): por eso hay dos modelos y un detector de idioma.`,
        "La escritura l33t (o→0, e→3) baja la detección en español, pero ninguna estafa pasa a \"parece normal\".",
      ];
}

/* ───────────── Piezas ───────────── */

function Card({ title, note, children, wide }: { title: string; note?: string; children: React.ReactNode; wide: boolean }) {
  return (
    <Panel style={wide ? { flexBasis: 480, flexGrow: 1, padding: 26 } : undefined}>
      <Display style={{ fontSize: size.lead + 2, lineHeight: (size.lead + 2) * 1.15 }}>{title}</Display>
      {note && <Small>{note}</Small>}
      {children}
    </Panel>
  );
}

function Grid({ children, wide }: { children: React.ReactNode; wide: boolean }) {
  return <View style={{ flexDirection: wide ? "row" : "column", flexWrap: "wrap", gap: wide ? 22 : 14, alignItems: "stretch" }}>{children}</View>;
}

const Sub = ({ l }: { l: "en" | "es" }) => <Txt bold style={{ marginTop: 4 }}>{`Sonny-${l.toUpperCase()}`}</Txt>;

function Bar({
  label,
  value,
  max = 1,
  color,
  c,
  valueText,
  track,
  ink,
}: {
  label: string;
  value: number;
  max?: number;
  color: string;
  c: Colors;
  valueText: string;
  track?: string;
  ink?: string;
}) {
  return (
    <View style={{ gap: 6 }} accessible accessibilityLabel={`${label}: ${valueText}`}>
      <Small style={ink ? { color: ink } : undefined}>{label}</Small>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1, height: 14, backgroundColor: track ?? c.soft, borderRadius: 7, overflow: "hidden" }}>
          <View style={{ width: `${Math.max(1, Math.min(100, (100 * value) / max))}%`, height: "100%", backgroundColor: color, borderRadius: 7 }} />
        </View>
        <Txt bold style={{ fontSize: size.small, minWidth: 70, textAlign: "right", ...(ink ? { color: ink } : {}) }}>
          {valueText}
        </Txt>
      </View>
    </View>
  );
}

function LearningChart({ data, c }: { data: { n: number; f1: number }[]; c: Colors }) {
  const W = 320;
  const H = 150;
  const pad = { l: 34, r: 16, t: 18, b: 26 };
  const maxN = Math.max(...data.map((d) => d.n));
  const lo = 0.75;
  const x = (n: number) => pad.l + ((W - pad.l - pad.r) * n) / maxN;
  const y = (f: number) => pad.t + (H - pad.t - pad.b) * (1 - (f - lo) / (1 - lo));
  const last = data[data.length - 1];
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} accessibilityLabel={`F1: ${data.map((d) => `${d.n} → ${d.f1.toFixed(2)}`).join(", ")}`}>
      {[0.8, 0.9, 1].map((g) => (
        <Line key={g} x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} stroke={c.line} strokeWidth={1} />
      ))}
      {[0.8, 0.9, 1].map((g) => (
        <SvgText key={`t${g}`} x={pad.l - 6} y={y(g) + 4} fontSize={11} fill={c.ink2} textAnchor="end" fontFamily={font.regular}>
          {g.toFixed(1)}
        </SvgText>
      ))}
      <Polyline points={data.map((d) => `${x(d.n)},${y(d.f1)}`).join(" ")} stroke={c.primary} strokeWidth={2} fill="none" />
      {data.map((d) => (
        <Circle key={d.n} cx={x(d.n)} cy={y(d.f1)} r={4.5} fill={c.primary} stroke={c.surface} strokeWidth={2} />
      ))}
      <SvgText x={x(last.n)} y={y(last.f1) - 10} fontSize={12} fill={c.ink} textAnchor="end" fontFamily={font.bold}>
        {last.f1.toFixed(3)}
      </SvgText>
      <SvgText x={pad.l} y={H - 6} fontSize={11} fill={c.ink2} fontFamily={font.regular}>
        {`${data[0].n}`}
      </SvgText>
      <SvgText x={W - pad.r} y={H - 6} fontSize={11} fill={c.ink2} textAnchor="end" fontFamily={font.regular}>
        {`${maxN}`}
      </SvgText>
    </Svg>
  );
}

function NgramBars({ up, down, c }: { up: [string, number][]; down: [string, number][]; c: Colors }) {
  const items = [...up.slice(0, 6), ...down.slice(0, 6)];
  const max = Math.max(...items.map(([, v]) => Math.abs(v)));
  const row = ([g, v]: [string, number]) => (
    <View key={g + v} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Text style={{ width: 74, fontFamily: font.bold, color: c.ink, fontSize: size.small, textAlign: "right" }}>{`'${g.replace(/ /g, "␣")}'`}</Text>
      <View style={{ flex: 1, height: 12 }}>
        <View style={{ width: `${(100 * Math.abs(v)) / max}%`, height: "100%", borderRadius: 6, backgroundColor: v > 0 ? c.toScam : c.toLegit }} />
      </View>
    </View>
  );
  return (
    <View style={{ gap: 6 }}>
      {up.slice(0, 6).map(row)}
      <View style={{ height: 6 }} />
      {down.slice(0, 6).map(row)}
    </View>
  );
}

function useModels() {
  const [m, setM] = useState<{ en: SonnyModel; es: SonnyModel; lang: SonnyModel } | null>(null);
  useEffect(() => {
    Promise.all([loadModel("en"), loadModel("es"), loadModel("lang")]).then(([en, es, lang]) => setM({ en, es, lang }));
  }, []);
  return m;
}

function DemoResult({ verdict, p, th, lang, c }: { verdict: Verdict; p: number; th: { safe: number; scam: number }; lang: Lang; c: Colors }) {
  const { fg, bg } = useVerdictColors(verdict);
  return (
    <View style={{ backgroundColor: bg, borderColor: fg, borderWidth: 2, borderRadius: 22, padding: 16, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Icon name={verdict} size={32} color={fg} />
        <Txt bold style={{ color: fg, fontSize: size.title }}>
          {L.verdict[verdict][lang]}
        </Txt>
        <Txt muted style={{ marginLeft: "auto" }}>{`p = ${p.toFixed(3)}`}</Txt>
      </View>
      {/* Barra 0–1 con las tres zonas y la posición de p */}
      <View style={{ height: 16, flexDirection: "row", borderRadius: 8, overflow: "hidden" }} accessibilityLabel={`p ${p.toFixed(2)}`}>
        <View style={{ flex: th.safe, backgroundColor: c.safe, opacity: 0.35 }} />
        <View style={{ flex: th.scam - th.safe, backgroundColor: c.warn, opacity: 0.35 }} />
        <View style={{ flex: 1 - th.scam, backgroundColor: c.scam, opacity: 0.35 }} />
        <View style={{ position: "absolute", left: `${p * 100}%`, top: 0, bottom: 0, width: 4, marginLeft: -2, backgroundColor: c.ink }} />
      </View>
    </View>
  );
}

function Demo({ lang, c }: { lang: Lang; c: Colors }) {
  const models = useModels();
  const [text, setText] = useState(DEMO_CHIPS[0]);
  const [attack, setAttack] = useState(false);
  const input = attack ? text.replace(/(\p{L}{3})/gu, `$1${ZWNJ}`) : text;

  const out = useMemo(() => {
    if (!models || !input.trim()) return null;
    const detected = detectLang(models.lang, input);
    const m = models[detected ?? lang];
    const p = scoreMessage(m, input);
    const th = m.thresholds as { scam: number; mid: number; safe: number };
    const verdict: Verdict = p >= th.scam ? "scam" : p >= th.safe ? "suspicious" : "safe";
    const words = explainWords(m, text); // se resalta el texto visible (sin los invisibles)
    const abs = words.map((w) => Math.abs(w.weight)).sort((a, b) => b - a);
    return { detected, p, th, verdict, words, cut: abs[Math.min(4, abs.length - 1)] ?? Infinity };
  }, [models, input, text, lang]);

  return (
    <View style={{ gap: 14 }}>
      <TextInput
        value={text}
        onChangeText={(v) => {
          setText(v);
          setAttack(false);
        }}
        placeholder={L.placeholder[lang]}
        placeholderTextColor={c.ink2}
        multiline
        accessibilityLabel={L.placeholder[lang]}
        style={{ minHeight: 96, fontSize: size.body, lineHeight: size.body * 1.4, fontFamily: font.regular, color: c.ink, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 18, padding: 14, textAlignVertical: "top" }}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {DEMO_CHIPS.map((s) => (
          <Pressable
            key={s}
            onPress={() => {
              setText(s);
              setAttack(false);
            }}
            accessibilityRole="button"
            accessibilityLabel={s}
            style={{ borderRadius: 22, backgroundColor: s === text ? c.primary : c.soft, paddingHorizontal: 14, minHeight: 44, justifyContent: "center", maxWidth: "100%" }}
          >
            <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: size.small, color: s === text ? c.primaryInk : c.softInk }}>
              {s.length > 32 ? `${s.slice(0, 32)}…` : s}
            </Text>
          </Pressable>
        ))}
      </View>

      {!models && <Small>…</Small>}
      {out && (
        <>
          <DemoResult verdict={out.verdict} p={out.p} th={out.th} lang={lang} c={c} />
          <Text style={{ fontSize: size.body, lineHeight: size.body * 1.6, color: c.ink, fontFamily: font.regular }}>
            {out.words.map((w, i) =>
              w.weight !== 0 && Math.abs(w.weight) >= out.cut ? (
                <Text key={i} style={{ backgroundColor: (w.weight > 0 ? c.toScam : c.toLegit) + "33", fontFamily: font.bold }}>
                  {w.word}
                </Text>
              ) : (
                <Text key={i}>{w.word}</Text>
              ),
            )}
          </Text>
          <Small>{`${L.langDetected[lang]}: ${out.detected ? out.detected.toUpperCase() : L.unsure[lang]}`}</Small>
        </>
      )}
      <ActionButton label={L.attack[lang]} icon="sparkle" kind={attack ? "primary" : "soft"} onPress={() => setAttack((a) => !a)} />
      {attack && <Small>{L.attackOn[lang]}</Small>}
      <Small>{L.onlyModel[lang]}</Small>
    </View>
  );
}

/* ───────────── Figuras originales (modelo/reports/figuras) ───────────── */

const FIGURES: { src: number; w: number; h: number; en: string; es: string }[] = [
  { src: require("../../assets/report/distribucion_puntuaciones.png"), w: 1407, h: 627, en: "How scores spread out, with the three zones", es: "Cómo se reparten las puntuaciones, con las tres zonas" },
  { src: require("../../assets/report/calibracion.png"), w: 1282, h: 586, en: "Calibration: when it says 70%, is it right 70% of the time?", es: "Calibración: si dice 70 %, ¿acierta el 70 % de las veces?" },
  { src: require("../../assets/report/comparacion_alternativas.png"), w: 1671, h: 525, en: "Sonny compared with other approaches", es: "Sonny frente a otras formas de hacerlo" },
  { src: require("../../assets/report/robustez.png"), w: 1639, h: 615, en: "Robustness when the message is altered", es: "Robustez cuando se altera el mensaje" },
  { src: require("../../assets/report/ngramas_peso.png"), w: 1393, h: 761, en: "The pieces of text that weigh the most", es: "Los trozos de texto que más pesan" },
  { src: require("../../assets/report/curva_aprendizaje.png"), w: 1291, h: 541, en: "Learning curve", es: "Curva de aprendizaje" },
  { src: require("../../assets/report/roc_pr.png"), w: 1485, h: 1184, en: "ROC and precision-recall curves, one per language", es: "Curvas ROC y de precisión-recall, una por idioma" },
];

function Figure({ f, lang, wide, c }: { f: (typeof FIGURES)[number]; lang: Lang; wide: boolean; c: Colors }) {
  return (
    <View
      style={[
        { gap: 10, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 24, padding: 14, alignSelf: "flex-start", width: "100%" },
        wide && { width: "48.9%" },
      ]}
    >
      {/* Las figuras tienen fondo claro: se enmarcan igual en modo oscuro. Caja de proporción fija. */}
      <View style={{ width: "100%", aspectRatio: f.w / f.h, backgroundColor: "#FCFCFB", borderRadius: 14, overflow: "hidden" }}>
        <Image source={f.src} style={{ width: "100%", height: "100%" }} resizeMode="contain" accessibilityLabel={f[lang]} />
      </View>
      <Txt bold style={{ fontSize: size.small + 1 }}>
        {f[lang]}
      </Txt>
    </View>
  );
}

/* ───────────── Página ───────────── */

export default function ModelResults() {
  const { settings, update } = useSettings();
  const c = useColors();
  const wide = useWide();
  const lang = settings.language;
  const off = (l: "en" | "es") => R[l].cascade.offline;
  const scamsSafe = off("en").scam.safe + off("es").scam.safe;
  const scamsTotal = LANGS.reduce((s, l) => s + off(l).scam.scam + off(l).scam.suspicious + off(l).scam.safe, 0);
  const onBrand = { track: "#FFFFFF99", ink: c.brandInk };

  return (
    <Screen width="wide">
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <Display level={wide ? "headline" : "title"} style={{ flex: 1 }}>
          {L.title[lang]}
        </Display>
        <Pressable
          onPress={() => update({ language: lang === "en" ? "es" : "en" })}
          accessibilityRole="button"
          accessibilityLabel={lang === "en" ? "Ver en español" : "View in English"}
          style={{ borderRadius: 24, backgroundColor: c.soft, paddingHorizontal: 18, minHeight: 48, justifyContent: "center" }}
        >
          <Txt bold style={{ color: c.softInk }}>
            {lang === "en" ? "Español" : "English"}
          </Txt>
        </Pressable>
      </View>

      <Columns ratio={[1.2, 1]} gap={28}>
        <>
          <SonnySays>
            <Txt>{L.intro[lang]}</Txt>
          </SonnySays>
          <Panel style={{ padding: wide ? 24 : 16 }}>
            <Demo lang={lang} c={c} />
          </Panel>
        </>
        <Panel tone="brand" style={{ padding: wide ? 30 : 20, gap: 16, borderRadius: 32 }}>
          <Display style={{ color: c.brandInk, fontSize: wide ? 30 : 26, lineHeight: wide ? 36 : 31 }}>{L.quality[lang]}</Display>
          <Txt style={{ color: c.brandInk }}>
            {summary(lang, pct(R.en.bootstrap.recall.value, 0), pct(R.es.bootstrap.recall.value, 0), `${scamsSafe} / ${scamsTotal}`)}
          </Txt>
          {LANGS.map((l) => {
            const b = R[l].bootstrap;
            return (
              <View key={l} style={{ gap: 10, backgroundColor: "#FFFFFF55", borderRadius: 20, padding: 16 }}>
                <Txt bold style={{ color: c.brandInk }}>{`Sonny-${l.toUpperCase()}`}</Txt>
                <Bar c={c} {...onBrand} label={L.caught[lang]} value={b.recall.value} color={c.brandInk} valueText={pct(b.recall.value)} />
                <Bar c={c} {...onBrand} label={L.precision[lang]} value={b.precision.value} color={c.brandInk} valueText={pct(b.precision.value)} />
                <Small style={{ color: c.brandInk }}>
                  {`${L.ci[lang]}: ${pct(b.recall.lo, 0)}–${pct(b.recall.hi, 0)}. F1 ${b.f1.value.toFixed(3)}, ROC-AUC ${b.auc.value.toFixed(3)}`}
                </Small>
              </View>
            );
          })}
        </Panel>
      </Columns>

      <Title style={{ marginTop: wide ? 16 : 8 }}>{L.tests[lang]}</Title>
      <Grid wide={wide}>
        <Card wide={wide} title={L.vs[lang]} note={L.vsNote[lang]}>
          {LANGS.map((l) => (
            <View key={l} style={{ gap: 10 }}>
              <Sub l={l} />
              {Object.entries(R[l].baselines).map(([name, m]) => (
                <Bar
                  key={name}
                  c={c}
                  label={BASELINE_NAMES[name]?.[lang] ?? name}
                  value={m.f1}
                  color={name.includes("Sonny") ? c.primary : c.neutralBar}
                  valueText={m.f1.toFixed(3)}
                />
              ))}
            </View>
          ))}
        </Card>

        <Card wide={wide} title={L.offline[lang]}>
          {LANGS.map((l) => (
            <View key={l} style={{ gap: 10 }}>
              <Sub l={l} />
              {(["scam", "legit"] as const).map((row) => (
                <View key={row} style={{ gap: 6 }}>
                  <Small>{row === "scam" ? L.scams[lang] : L.legit[lang]}</Small>
                  <View style={{ flexDirection: "row", gap: 18, flexWrap: "wrap" }}>
                    {(["scam", "suspicious", "safe"] as const).map((v) => (
                      <View key={v} style={{ flexDirection: "row", alignItems: "center", gap: 6 }} accessible accessibilityLabel={`${L.verdict[v][lang]}: ${off(l)[row][v]}`}>
                        <Icon name={v} size={24} color={v === "scam" ? c.scam : v === "suspicious" ? c.warn : c.safe} />
                        <Txt bold>{off(l)[row][v]}</Txt>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
              <Small>{`${pct(R[l].cascade.kept_on_device, 0)} ${L.kept[lang]}`}</Small>
            </View>
          ))}
        </Card>

        <Card wide={wide} title={L.attackTitle[lang]} note={L.attackText[lang]}>
          {LANGS.map((l) => {
            const after = R[l].robustness.find((r) => r.name === "Caracteres invisibles insertados");
            return (
              <View key={l} style={{ gap: 10 }}>
                <Sub l={l} />
                <Bar c={c} label={L.noAttack[lang]} value={BEFORE[l].recall_before} color={c.primary} valueText={pct(BEFORE[l].recall_before)} />
                <Bar c={c} label={L.before[lang]} value={BEFORE[l].recall_after} color={c.scam} valueText={pct(BEFORE[l].recall_after)} />
                {after && <Bar c={c} label={L.after[lang]} value={after.recall_after} color={c.safe} valueText={pct(after.recall_after)} />}
              </View>
            );
          })}
        </Card>

        <Card wide={wide} title={L.robust[lang]} note={L.robustNote[lang]}>
          {LANGS.map((l) => (
            <View key={l} style={{ gap: 10 }}>
              <Sub l={l} />
              {R[l].robustness.map((r) => (
                <Bar key={r.name} c={c} label={ROBUST_NAMES[r.name]?.[lang] ?? r.name} value={r.verdict_changed} color={c.primary} valueText={pct(r.verdict_changed)} />
              ))}
            </View>
          ))}
        </Card>

        <Card wide={wide} title={L.learned[lang]} note={L.learnedNote[lang]}>
          {LANGS.map((l) => (
            <View key={l} style={{ gap: 10 }}>
              <Sub l={l} />
              <NgramBars up={R[l].ngrams[0]} down={R[l].ngrams[1]} c={c} />
            </View>
          ))}
        </Card>

        <Card wide={wide} title={L.learning[lang]} note={L.learningNote[lang]}>
          {LANGS.map((l) => (
            <View key={l} style={{ gap: 6 }}>
              <Sub l={l} />
              <LearningChart data={R[l].learning} c={c} />
            </View>
          ))}
        </Card>
      </Grid>

      <Title style={{ marginTop: wide ? 16 : 8 }}>{L.figures[lang]}</Title>
      <Small>{L.figuresNote[lang]}</Small>
      <Grid wide={wide}>
        {FIGURES.map((f) => (
          <Figure key={f.en} f={f} lang={lang} wide={wide} c={c} />
        ))}
      </Grid>

      <Grid wide={wide}>
        <Card wide={wide} title={L.limits[lang]}>
          {limits(lang).map((x, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
              <Icon name="suspicious" size={24} color={c.warn} />
              <Txt style={{ flex: 1, fontSize: size.small + 1, lineHeight: (size.small + 1) * 1.45 }}>{x}</Txt>
            </View>
          ))}
        </Card>
        <Card wide={wide} title={L.speed[lang]}>
          {Object.entries(R.js.models).map(([name, m]) => (
            <Txt key={name}>{`${name}: ${m.mb.toFixed(2)} MB, ${m.median_ms.toFixed(2)} ms ${L.perMsg[lang]}`}</Txt>
          ))}
          <Small>{L.testsCount[lang]}</Small>
          <Display style={{ fontSize: size.lead + 2, lineHeight: (size.lead + 2) * 1.15, marginTop: 8 }}>{L.data[lang]}</Display>
          <Small>SMS Spam Collection, Almeida and Gómez Hidalgo, UCI (CC BY 4.0)</Small>
          <Small>SMS Phishing Dataset, Mishra and Soni, Mendeley Data (CC BY 4.0)</Small>
          <Small>SpaPhish, Bustio-Martínez et al., Mendeley Data (CC BY 4.0)</Small>
          <Small>softecapps/spam_ham_spanish, Hugging Face (Apache-2.0), 10 labels corrected</Small>
        </Card>
      </Grid>
    </Screen>
  );
}

// ¿Por qué?: el mensaje con las palabras que más pesan, lo que vieron las reglas y la IA.

import { Redirect } from "expo-router";
import { Text, View } from "react-native";

import { Columns, Panel, Screen, Small, Title, Txt } from "../components/ui";
import { useAnalysis } from "../lib/analysis-store";
import { useT } from "../lib/i18n";
import { useSettings } from "../lib/settings";
import { signalText } from "../lib/templates";
import { font, size, useColors } from "../lib/theme";

export default function Why() {
  const { analysis: a } = useAnalysis();
  const { settings } = useSettings();
  const t = useT();
  const c = useColors();
  if (!a) return <Redirect href="/" />;

  // Solo se resaltan las palabras que más pesan, para no saturar.
  const weights = a.words
    .map((w) => Math.abs(w.weight))
    .filter((w) => w > 0)
    .sort((x, y) => y - x);
  const cut = weights[Math.min(5, weights.length - 1)] ?? Infinity;
  const signals = a.rules.links.flatMap((l) =>
    l.signals.map((s) => ({ host: l.host, s })),
  );

  return (
    <Screen back width="wide">
      <Title>{t("whyTitle")}</Title>
      <Columns gap={28}>
        <Panel>
          <Small>{t("yourMessage")}</Small>
          <Text
            style={{
              fontSize: size.body,
              lineHeight: size.body * 1.6,
              color: c.ink,
              fontFamily: font.regular,
            }}
          >
            {a.words.map((w, i) => {
              const strong = w.weight !== 0 && Math.abs(w.weight) >= cut;
              if (!strong) return <Text key={i}>{w.word}</Text>;
              const col = w.weight > 0 ? c.toScam : c.toLegit;
              return (
                <Text
                  key={i}
                  style={{
                    backgroundColor: col + "30",
                    textDecorationLine: "underline",
                    textDecorationColor: col,
                    fontFamily: font.bold,
                  }}
                >
                  {w.word}
                </Text>
              );
            })}
          </Text>
          <View style={{ flexDirection: "row", gap: 18, flexWrap: "wrap" }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <View
                style={{
                  width: 22,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: c.toScam,
                }}
              />
              <Small>{t("legendScam")}</Small>
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <View
                style={{
                  width: 22,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: c.toLegit,
                }}
              />
              <Small>{t("legendLegit")}</Small>
            </View>
          </View>
        </Panel>

        <View style={{ gap: 14 }}>
          <Panel>
            <Txt bold>{t("linkSignals")}</Txt>
            {a.rules.links.length === 0 ? (
              <Txt muted>{t("noLinks")}</Txt>
            ) : signals.length === 0 ? (
              <Txt muted>{a.rules.links.map((l) => l.host).join(", ")}</Txt>
            ) : (
              signals.map(({ host, s }, i) => (
                <View key={i} style={{ gap: 2 }}>
                  <Txt>
                    {signalText(s, settings.language, settings.formality)}
                  </Txt>
                  <Small>{host}</Small>
                </View>
              ))
            )}
          </Panel>

          {a.aiSignals.length > 0 && (
            <Panel>
              <Txt bold>{t("aiSignals")}</Txt>
              {a.aiSignals.map((s, i) => (
                <View key={i} style={{ gap: 2 }}>
                  {s.quote ? (
                    <Txt style={{ fontStyle: "italic" }}>“{s.quote}”</Txt>
                  ) : null}
                  <Txt muted>{s.explanation}</Txt>
                </View>
              ))}
            </Panel>
          )}

          <Panel>
            <Txt bold>{t("howIDecided")}</Txt>
            <Txt muted>
              {a.ai === "used" ? t("decidedModelAi") : t("decidedModel")}
            </Txt>
          </Panel>
        </View>
      </Columns>
    </Screen>
  );
}

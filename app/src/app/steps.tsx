// Qué hago ahora: pasos grandes de uno en uno (máximo tres) + ruta de emergencia (consideraciones.md 2.5).
// Los números sí tienen sentido aquí: es una secuencia.

import { Redirect } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import {
  ActionButton,
  Columns,
  Screen,
  SonnySays,
  Title,
  Txt,
} from "../components/ui";
import { useAnalysis } from "../lib/analysis-store";
import { useT } from "../lib/i18n";
import { size, useColors } from "../lib/theme";

function StepList({ steps }: { steps: string[] }) {
  const c = useColors();
  return (
    <View style={{ gap: 14 }} accessibilityRole="list">
      {steps.map((s, i) => (
        <View
          key={i}
          style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: c.brand,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Txt bold style={{ color: c.brandInk, fontSize: size.lead }}>
              {i + 1}
            </Txt>
          </View>
          <Txt
            bold
            style={{
              flex: 1,
              fontSize: size.lead - 2,
              lineHeight: (size.lead - 2) * 1.35,
            }}
          >
            {s}
          </Txt>
        </View>
      ))}
    </View>
  );
}

export default function Steps() {
  const { analysis: a } = useAnalysis();
  const t = useT();
  const [emergency, setEmergency] = useState(false);
  if (!a) return <Redirect href="/" />;

  return (
    <Screen back width="wide">
      <Title>{t("stepsTitle")}</Title>
      <Columns gap={40}>
        <StepList steps={a.steps} />
        <View style={{ gap: 12 }}>
          {a.verdict !== "safe" && !emergency && (
            <View style={{ gap: 12 }}>
              <Txt bold>{t("alreadyGaveData")}</Txt>
              <ActionButton
                label={t("yesWhatDo")}
                onPress={() => setEmergency(true)}
                kind="soft"
              />
            </View>
          )}
          {emergency && (
            <View style={{ gap: 16 }}>
              <SonnySays>
                <Txt>{t("calmFirst")}</Txt>
              </SonnySays>
              <StepList steps={a.emergencySteps} />
            </View>
          )}
        </View>
      </Columns>
    </Screen>
  );
}

// Ejemplos para el jurado y demostraciones (consideraciones.md 2.6), fuera de la pantalla principal.
// Son los mensajes de la batería de prueba (modelo/data/manual/bateria.csv).

import { useState } from "react";
import { Pressable, View } from "react-native";

import {
  ActionButton,
  ButtonRow,
  Columns,
  half,
  Notice,
  Panel,
  Screen,
  Small,
  SonnyThinking,
  Title,
  Txt,
} from "../components/ui";
import { useT } from "../lib/i18n";
import { useSettings } from "../lib/settings";
import { size, useColors, useWide } from "../lib/theme";
import { useRunAnalysis } from "../lib/use-run-analysis";

type Example = { kind: string; text: string };

const EXAMPLES: Record<"en" | "es", Example[]> = {
  es: [
    {
      kind: "Paquete retenido",
      text: "Su paquete está retenido. Pague 1,99 para liberarlo en: entregas-envio.info/pago",
    },
    {
      kind: "Banco falso",
      text: "Su cuenta ha sido bloqueada por seguridad. Verifique sus datos aquí: banco-verifica.xyz",
    },
    {
      kind: "Premio falso",
      text: "Felicidades, ha ganado un iPhone. Reclámelo hoy aquí: premios-ya.top",
    },
    {
      kind: "Multa",
      text: "Tiene una multa de tránsito pendiente. Pague antes de 24 horas para evitar recargos: multas-pago.click",
    },
    {
      kind: "Inversión",
      text: "Duplique su dinero en 7 días con criptomonedas. Inversión garantizada",
    },
    {
      kind: "Código del banco",
      text: "Tu código es 482913. No lo compartas con nadie.",
    },
    {
      kind: "Cita médica",
      text: "Recordatorio de su cita el día 12 a las 10:00 en el consultorio",
    },
    { kind: "Familia", text: "¿Vienes a comer el domingo?" },
  ],
  en: [
    {
      kind: "Package on hold",
      text: "Your package is on hold. Pay $1.99 to release it at: delivery-redeliver.info/pay",
    },
    {
      kind: "Fake bank",
      text: "Your bank account has been locked. Verify your details here: bank-verify.xyz",
    },
    {
      kind: "Fake prize",
      text: "Congratulations! You have won an iPhone. Claim it today: prizes-now.top",
    },
    {
      kind: "Toll",
      text: "You have an unpaid toll. Pay within 24 hours to avoid a fine: toll-pay.click",
    },
    {
      kind: "Investment",
      text: "Double your money in 7 days with crypto. Guaranteed returns",
    },
    {
      kind: "Bank code",
      text: "Your verification code is 482913. Do not share it with anyone.",
    },
    {
      kind: "Appointment",
      text: "Reminder: your appointment is on the 12th at 10:00",
    },
    { kind: "Family", text: "Are you coming for dinner on Sunday?" },
  ],
};

function ExampleRow({
  e,
  onPress,
  disabled,
}: {
  e: Example;
  onPress: () => void;
  disabled: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={e.text}
      style={({ pressed }) => ({
        borderRadius: 18,
        borderWidth: 1,
        borderColor: c.line,
        backgroundColor: pressed ? c.soft : c.surface,
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 4,
        minHeight: 64,
      })}
    >
      <Small>{e.kind}</Small>
      <Txt
        style={{ fontSize: size.small + 1, lineHeight: (size.small + 1) * 1.4 }}
      >
        {e.text}
      </Txt>
    </Pressable>
  );
}

export default function Examples() {
  const { settings } = useSettings();
  const t = useT();
  const { run, busy, error } = useRunAnalysis();
  const wide = useWide();
  const order: ("en" | "es")[] =
    settings.language === "es" ? ["es", "en"] : ["en", "es"];
  // En el celular, un solo idioma a la vez (lista más corta); en la computadora, los dos lado a lado.
  const [shown, setShown] = useState<"en" | "es">(order[0]);

  const panel = (lang: "en" | "es") => (
    <Panel key={lang} style={{ gap: 10 }}>
      <Txt bold>{lang === "es" ? "Español" : "English"}</Txt>
      <View style={{ gap: 10 }}>
        {EXAMPLES[lang].map((e) => (
          <ExampleRow key={e.text} e={e} disabled={busy} onPress={() => run({ text: e.text })} />
        ))}
      </View>
    </Panel>
  );

  return (
    <Screen width="wide">
      <Title>{t("examplesTitle")}</Title>
      <Small>{t("examplesIntro")}</Small>
      {busy && <SonnyThinking text={t("analyzing")} />}
      {error && <Notice tone="warn">{error}</Notice>}
      {wide ? (
        <Columns gap={24}>{[panel(order[0]), panel(order[1])]}</Columns>
      ) : (
        <>
          <ButtonRow>
            {(["es", "en"] as const).map((l) => (
              <ActionButton
                key={l}
                label={l === "es" ? "Español" : "English"}
                icon={shown === l ? "check" : undefined}
                kind={shown === l ? "primary" : "soft"}
                onPress={() => setShown(l)}
                style={half}
              />
            ))}
          </ButtonRow>
          {panel(shown)}
        </>
      )}
    </Screen>
  );
}

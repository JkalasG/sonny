// Ajustes (arquitectura 10): idioma, trato, voz, apariencia y modo detallado. Solo en el dispositivo.

import { View } from "react-native";

import {
  ActionButton,
  Panel,
  Screen,
  Small,
  Title,
  Txt,
} from "../components/ui";
import { useWide } from "../lib/theme";
import { useT } from "../lib/i18n";
import { useSettings } from "../lib/settings";

function Choice<T extends string | boolean>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <Panel style={useWide() ? { flexGrow: 1, flexBasis: 420 } : undefined}>
      <Txt bold>{label}</Txt>
      <View
        style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}
        accessibilityRole="radiogroup"
      >
        {options.map((o) => (
          <ActionButton
            key={String(o.value)}
            label={o.label}
            icon={o.value === value ? "check" : undefined}
            kind={o.value === value ? "primary" : "soft"}
            onPress={() => onChange(o.value)}
            style={{ flex: 1, width: undefined, minWidth: 130 }}
          />
        ))}
      </View>
    </Panel>
  );
}

export default function SettingsScreen() {
  const { settings, update } = useSettings();
  const t = useT();
  const wide = useWide();
  return (
    <Screen width="wide">
      <Title>{t("settingsTitle")}</Title>
      <View
        style={{
          flexDirection: wide ? "row" : "column",
          flexWrap: "wrap",
          gap: wide ? 20 : 14,
        }}
      >
        <Choice
          label={t("language")}
          value={settings.language}
          options={[
            { value: "en", label: "English" },
            { value: "es", label: "Español" },
          ]}
          onChange={(language) => update({ language })}
        />
        {settings.language === "es" && (
          <Choice
            label={t("formality")}
            value={settings.formality}
            options={[
              { value: "tu", label: "Tú" },
              { value: "usted", label: "Usted" },
            ]}
            onChange={(formality) => update({ formality })}
          />
        )}
        <Choice
          label={t("voice")}
          value={settings.voice}
          options={[
            { value: true, label: t("on") },
            { value: false, label: t("off") },
          ]}
          onChange={(voice) => update({ voice })}
        />
        <Choice
          label={t("theme")}
          value={settings.theme}
          options={[
            { value: "light", label: t("themeLight") },
            { value: "dark", label: t("themeDark") },
          ]}
          onChange={(theme) => update({ theme })}
        />
        <Choice
          label={t("detailed")}
          value={settings.detailed}
          options={[
            { value: true, label: t("on") },
            { value: false, label: t("off") },
          ]}
          onChange={(detailed) => update({ detailed })}
        />
      </View>
      <Small>{t("privacy")}</Small>
    </Screen>
  );
}

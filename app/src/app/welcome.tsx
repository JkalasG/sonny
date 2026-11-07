// Primera vez: Sonny se presenta y pregunta el idioma (English preseleccionado) y, en español, tú o usted.
// Cabe en una sola vista: opciones lado a lado. En la computadora, bloque de marca + opciones.

import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { SonnyAvatar } from "../components/SonnyAvatar";
import { ActionButton, ButtonRow, Columns, Display, half, Panel, Screen, Txt } from "../components/ui";
import { translate, type TKey } from "../lib/i18n";
import { useSettings, type Formality, type Lang } from "../lib/settings";
import { size, useColors, useWide } from "../lib/theme";

export default function Welcome() {
  const { settings, update } = useSettings();
  const c = useColors();
  const wide = useWide();
  const [lang, setLang] = useState<Lang>(settings.language);
  const [formality, setFormality] = useState<Formality>(settings.formality);
  const t = (k: TKey) => translate(k, lang, formality);

  const finish = () => {
    update({ language: lang, formality, onboarded: true });
    router.replace("/");
  };

  const choices = (
    <View style={{ gap: 12 }}>
      <Txt bold style={{ fontSize: size.lead - 2 }}>
        {t("chooseLanguage")}
      </Txt>
      <ButtonRow>
        <ActionButton label="English" icon={lang === "en" ? "check" : undefined} kind={lang === "en" ? "primary" : "soft"} onPress={() => setLang("en")} style={half} />
        <ActionButton label="Español" icon={lang === "es" ? "check" : undefined} kind={lang === "es" ? "primary" : "soft"} onPress={() => setLang("es")} style={half} />
      </ButtonRow>
      {lang === "es" && (
        <>
          <Txt bold style={{ fontSize: size.lead - 2, marginTop: 6 }}>
            {t("chooseFormality")}
          </Txt>
          <ButtonRow>
            <ActionButton label="De tú" icon={formality === "tu" ? "check" : undefined} kind={formality === "tu" ? "primary" : "soft"} onPress={() => setFormality("tu")} style={half} />
            <ActionButton label="De usted" icon={formality === "usted" ? "check" : undefined} kind={formality === "usted" ? "primary" : "soft"} onPress={() => setFormality("usted")} style={half} />
          </ButtonRow>
        </>
      )}
      <View style={{ height: 6 }} />
      <ActionButton label={t("start")} onPress={finish} kind="primary" />
    </View>
  );

  if (wide) {
    return (
      <Screen bare width="wide">
        <Columns ratio={[1.1, 1]} gap={36} align="center">
          <Panel tone="hero" style={{ padding: 44, gap: 18, borderRadius: 36 }}>
            <SonnyAvatar size={250} glow />
            <Display level="hero" style={{ color: c.heroInk }}>
              {t("welcomeHello")}
            </Display>
            <Txt style={{ color: c.heroInk, fontSize: size.lead, lineHeight: size.lead * 1.4 }}>{t("welcomeIntro")}</Txt>
          </Panel>
          <Panel style={{ padding: 32 }}>{choices}</Panel>
        </Columns>
      </Screen>
    );
  }

  return (
    <Screen bare>
      <View style={{ alignItems: "center", gap: 6 }}>
        <SonnyAvatar size={124} />
        <Display level="headline" style={{ textAlign: "center" }}>
          {t("welcomeHello")}
        </Display>
        <Txt muted style={{ textAlign: "center", fontSize: size.body - 1, lineHeight: (size.body - 1) * 1.4 }}>
          {t("welcomeIntro")}
        </Txt>
      </View>
      {choices}
    </Screen>
  );
}

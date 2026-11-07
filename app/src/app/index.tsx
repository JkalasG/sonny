// Inicio: Sonny pregunta y la tarjeta recibe el mensaje (pegar/escribir o captura).
// Computadora: bloque de marca a la izquierda y tarjeta a la derecha, todo en una sola vista.
// Celular: cabe en una pantalla sin desplazarse (el menú está abajo).

import * as Clipboard from "expo-clipboard";
import { Redirect } from "expo-router";
import { useState } from "react";
import { Platform, TextInput, View } from "react-native";

import { Icon } from "../components/Icon";
import { PageSkeleton } from "../components/Skeleton";
import { SonnyAvatar } from "../components/SonnyAvatar";
import {
  ActionButton,
  ButtonRow,
  Columns,
  Display,
  ForwardedMessage,
  half,
  Notice,
  Panel,
  Screen,
  Small,
  SonnySays,
  SonnyThinking,
  Txt,
} from "../components/ui";
import { useT } from "../lib/i18n";
import { pickImage } from "../lib/media";
import { useSettings } from "../lib/settings";
import { font, size, useColors, useWide } from "../lib/theme";
import { useRunAnalysis } from "../lib/use-run-analysis";

export default function Home() {
  const { settings, loaded } = useSettings();
  const t = useT();
  const c = useColors();
  const wide = useWide();
  const [text, setText] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const { run, busy, error, setError } = useRunAnalysis();

  if (!loaded) return <PageSkeleton />;
  if (!settings.onboarded) return <Redirect href="/welcome" />;

  const photo = async (source: "camera" | "library") => {
    setError(null);
    const r = await pickImage(source).catch(() => "canceled" as const);
    if (r === "denied") return setError(t("permissionDenied"));
    if (r === "canceled") return;
    setPending(null);
    run(r);
  };

  const check = () => {
    setPending(text.trim() || null);
    run({ text });
  };

  const paste = async () => {
    const s = await Clipboard.getStringAsync().catch(() => "");
    if (s) setText(s);
  };

  const native = Platform.OS !== "web";

  const card = busy ? (
    <View style={{ gap: 14 }}>
      {pending && <ForwardedMessage text={pending} label={t("forwardedLabel")} />}
      <SonnyThinking text={t("analyzing")} />
    </View>
  ) : (
    <Panel style={{ gap: 14, padding: wide ? 28 : 16 }}>
      {wide && <Display>{t("showMe")}</Display>}
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={t("pastePlaceholder")}
        placeholderTextColor={c.ink2}
        multiline
        accessibilityLabel={t("pastePlaceholder")}
        style={{
          minHeight: wide ? 170 : 112,
          fontSize: size.body,
          lineHeight: size.body * 1.4,
          fontFamily: font.regular,
          color: c.ink,
          textAlignVertical: "top",
          borderWidth: 2,
          borderColor: c.line,
          borderRadius: 18,
          padding: 14,
          backgroundColor: c.bg,
        }}
      />
      <ButtonRow>
        <ActionButton icon="clipboard" label={t("paste")} onPress={paste} kind="soft" style={half} />
        <ActionButton icon="search" label={t("check")} onPress={check} style={half} />
      </ButtonRow>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
        <Small>{t("orWord")}</Small>
        <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
      </View>
      {native ? (
        <ButtonRow>
          <ActionButton icon="camera" label={t("photoShort")} onPress={() => photo("camera")} kind="brand" style={half} />
          <ActionButton icon="image" label={t("screenshotShort")} onPress={() => photo("library")} kind="brand" style={half} />
        </ButtonRow>
      ) : (
        <ActionButton icon="upload" label={t("pickScreenshot")} onPress={() => photo("library")} kind="brand" />
      )}
      {wide && <Small>{t("photoPrivacy")}</Small>}
    </Panel>
  );

  return (
    <Screen width="wide">
      {wide ? (
        <Columns ratio={[1.05, 1]} gap={32} align="stretch">
          <Panel tone="hero" style={{ padding: 40, gap: 18, justifyContent: "center", borderRadius: 36 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 28 }}>
              <SonnyAvatar size={210} glow />
              <View style={{ flex: 1, gap: 12 }}>
                {([["shield", "featScam"], ["image", "featPhotos"], ["check", "featOffline"]] as const).map(([icon, key]) => (
                  <View key={key} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.heroSoft, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14 }}>
                    <Icon name={icon} size={26} color={c.gold} />
                    <Txt bold style={{ color: c.heroInk, fontSize: size.small + 1, lineHeight: (size.small + 1) * 1.3, flex: 1 }}>
                      {t(key)}
                    </Txt>
                  </View>
                ))}
              </View>
            </View>
            <Display level="hero" style={{ color: c.heroInk }}>
              {t("homeQuestion")}
            </Display>
            <Txt style={{ color: c.heroInk, fontSize: size.lead, lineHeight: size.lead * 1.4, opacity: 0.92 }}>{t("welcomeIntro")}</Txt>
          </Panel>
          <View style={{ gap: 16 }}>
            {card}
            {error && <Notice tone="warn">{error}</Notice>}
            <Small>{t("disclaimer")}</Small>
          </View>
        </Columns>
      ) : (
        <>
          <SonnySays avatar={64}>
            <Display level="headline" style={{ fontSize: 27, lineHeight: 31 }}>
              {t("homeQuestion")}
            </Display>
            <Txt style={{ fontSize: size.small + 1, lineHeight: (size.small + 1) * 1.35 }}>{t("welcomeIntro")}</Txt>
          </SonnySays>
          {card}
          {error && <Notice tone="warn">{error}</Notice>}
          <Small style={{ fontSize: 16, lineHeight: 22 }}>{t("disclaimer")}</Small>
        </>
      )}
    </Screen>
  );
}

// Resultado: tu mensaje reenviado + la respuesta de Sonny (una frase grande y una razón) + acciones.
// Cabe en una sola vista: en el celular el mensaje se recorta a 2 líneas; en la computadora, dos columnas.

import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { SonnyAvatar, type Mood } from "../components/SonnyAvatar";
import { ActionButton, ButtonRow, Columns, ForwardedMessage, half, Notice, Panel, Screen, Small, TextLink, Txt, VerdictBubble } from "../components/ui";
import { useAnalysis } from "../lib/analysis-store";
import { go } from "../lib/nav";
import { useT, type TKey } from "../lib/i18n";
import { speak, stopSpeaking } from "../lib/media";
import { useSettings } from "../lib/settings";
import { useWide } from "../lib/theme";

// Cara de Sonny según el veredicto.
const MOOD: Record<"scam" | "suspicious" | "safe", Mood> = { scam: "worried", suspicious: "thinking", safe: "happy" };

const VERDICT_LABEL: Record<"scam" | "suspicious" | "safe", TKey> = {
  scam: "verdictScam",
  suspicious: "verdictSuspicious",
  safe: "verdictSafe",
};

export default function Result() {
  const { analysis: a } = useAnalysis();
  const { settings } = useSettings();
  const t = useT();
  const wide = useWide();
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => stopSpeaking(), []);
  if (!a) return <Redirect href="/" />;

  const notice =
    a.ai === "offline" ? t("offlineNotice") : a.ai === "failed" || a.ai === "not_configured" ? t("aiFailedNotice") : null;
  const otherLang = a.langDetected && a.messageLang !== settings.language;

  const toggleVoice = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    speak(`${a.headline} ${a.reason}`, settings.language, () => setSpeaking(false));
  };

  const notes = (
    <>
      {notice && <Notice>{notice}</Notice>}
      {a.aiProvider === "mock" && <Notice>{t("mockNotice")}</Notice>}
      {settings.detailed && (
        <Panel style={{ padding: 14 }}>
          <Small>
            {`p = ${a.p.toFixed(3)}, ${a.messageLang.toUpperCase()}. T_SAFE ${a.thresholds.safe}, T_MID ${a.thresholds.mid}, T_SCAM ${a.thresholds.scam}. AI: ${a.ai}${a.aiProvider ? ` (${a.aiProvider})` : ""}${a.rules.severe ? ". Rules: severe" : ""}`}
          </Small>
        </Panel>
      )}
    </>
  );

  const actions = (
    <View style={{ gap: 12 }}>
      <ActionButton label={t("whatNow")} onPress={() => go("/steps", "push")} />
      <ButtonRow>
        {settings.voice && (
          <ActionButton icon={speaking ? "stop" : "speaker"} label={speaking ? t("stopListening") : t("listen")} onPress={toggleVoice} kind="soft" style={half} />
        )}
        <ActionButton label={t("why")} onPress={() => go("/why", "push")} kind="soft" style={half} />
      </ButtonRow>
      <TextLink icon="back" label={t("checkAnother")} onPress={() => router.dismissTo("/")} />
    </View>
  );

  const verdict = <VerdictBubble verdict={a.verdict} label={t(VERDICT_LABEL[a.verdict])} headline={a.headline} reason={a.reason} />;

  if (wide) {
    return (
      <Screen width="wide" back>
        <Columns ratio={[0.8, 1.2]} gap={36}>
          <>
            <ForwardedMessage text={a.text} label={t("forwardedLabel")} lines={8} />
            {otherLang && <Small>{t("otherLanguageNotice")}</Small>}
            <View style={{ alignItems: "center", gap: 14, marginTop: 8 }}>
              <SonnyAvatar size={190} mood={MOOD[a.verdict]} />
              <Txt bold style={{ textAlign: "center" }}>
                {t("goodJob")}
              </Txt>
              <Small style={{ textAlign: "center" }}>{t("closing")}</Small>
            </View>
          </>
          <>
            {verdict}
            {notes}
            {actions}
          </>
        </Columns>
      </Screen>
    );
  }

  return (
    <Screen back>
      <ForwardedMessage text={a.text} label={t("forwardedLabel")} lines={2} />
      {otherLang && <Small>{t("otherLanguageNotice")}</Small>}
      <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
        <SonnyAvatar size={48} mood={MOOD[a.verdict]} />
        <View style={{ flex: 1 }}>{verdict}</View>
      </View>
      {notes}
      {actions}
    </Screen>
  );
}

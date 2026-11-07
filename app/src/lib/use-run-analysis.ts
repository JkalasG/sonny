import { router } from "expo-router";
import { useCallback, useState } from "react";

import { useAnalysis } from "./analysis-store";
import { analyze, PhotoError, type Input } from "./cascade";
import { useT, type TKey } from "./i18n";
import { useSettings } from "./settings";

/** Lanza el análisis, guarda el resultado y abre la pantalla de resultado. */
export function useRunAnalysis() {
  const { settings } = useSettings();
  const { setAnalysis } = useAnalysis();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (input: Input) => {
      setError(null);
      if ("text" in input && !input.text.trim()) {
        setError(t("emptyMessage"));
        return;
      }
      setBusy(true);
      try {
        const result = await analyze(input, settings);
        setAnalysis(result);
        router.push("/result");
      } catch (e) {
        const key: TKey = e instanceof PhotoError ? (e.kind === "needs_internet" ? "photoNeedsInternet" : "photoUnreadable") : "emptyMessage";
        if (!(e instanceof PhotoError)) console.error("[sonny] análisis falló", e);
        setError(t(key));
      } finally {
        setBusy(false);
      }
    },
    [settings, setAnalysis, t],
  );

  return { run, busy, error, setError };
}

import {
  AtkinsonHyperlegible_400Regular,
  AtkinsonHyperlegible_700Bold,
  useFonts,
} from "@expo-google-fonts/atkinson-hyperlegible";
import { Fredoka_500Medium, Fredoka_600SemiBold } from "@expo-google-fonts/fredoka";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { markHydrated, NavSkeleton, PageSkeleton } from "../components/Skeleton";
import { AnalysisProvider } from "../lib/analysis-store";
import { SettingsProvider, useSettings } from "../lib/settings";
import { useColors, useIsDark } from "../lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppStack({ fontsReady }: { fontsReady: boolean }) {
  const c = useColors();
  const dark = useIsDark();
  const { loaded } = useSettings();
  useEffect(markHydrated, []);
  if (!fontsReady || !loaded) return <PageSkeleton />;
  // Sin cabecera nativa: cada pantalla trae su barra (marca o "Volver") y el menú (consideraciones.md 4.3).
  return (
    <>
      <StatusBar style={dark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: "fade" }} />
      <NavSkeleton />
    </>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({ AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold, Fredoka_500Medium, Fredoka_600SemiBold });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <AnalysisProvider>
          <AppStack fontsReady={loaded || !!error} />
        </AnalysisProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

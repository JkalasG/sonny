// Ajustes del usuario (documento de arquitectura, sección 10). Solo en el dispositivo.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "es";
export type Formality = "tu" | "usted";
export type Theme = "light" | "dark";

export type Settings = {
  language: Lang;        // idioma de la app, de las respuestas y modelo principal
  formality: Formality;  // solo español
  voice: boolean;        // botón "Escuchar"; desactivado por defecto
  detailed: boolean;     // modo detallado (puntuación, fuente)
  onboarded: boolean;    // ya eligió idioma la primera vez
  theme: Theme;          // modo claro u oscuro; claro por defecto (no sigue al sistema)
};

const DEFAULTS: Settings = {
  language: "en",        // inglés por defecto (hackathon internacional); español en la bienvenida y en Ajustes
  formality: "tu",
  voice: false,
  detailed: false,
  onboarded: false,
  theme: "light",
};

const KEY = "sonny.settings.v1";

type Ctx = {
  settings: Settings;
  loaded: boolean;
  update: (patch: Partial<Settings>) => void;
};

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setSettings({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) });
      })
      .catch(() => {}) // sin almacenamiento: se usan los valores por defecto
      .finally(() => setLoaded(true));
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return <SettingsContext.Provider value={{ settings, loaded, update }}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Ctx {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings fuera de SettingsProvider");
  return ctx;
}

// Guarda el último análisis para las pantallas Resultado, Qué hago ahora y ¿Por qué?
// Solo en memoria: no se guarda ningún mensaje.

import { createContext, useContext, useState, type ReactNode } from "react";

import type { Analysis } from "./cascade";

type Ctx = { analysis: Analysis | null; setAnalysis: (a: Analysis | null) => void };
const AnalysisContext = createContext<Ctx | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  return <AnalysisContext.Provider value={{ analysis, setAnalysis }}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis(): Ctx {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error("useAnalysis fuera de AnalysisProvider");
  return ctx;
}

// Navegación con esqueleto de carga: los menús llaman a go()/goBack() en lugar de router.* directamente,
// y <NavSkeleton> (components/Skeleton.tsx) muestra el esqueleto de la página de destino hasta que su
// <Screen> recibe el foco. Hace falta porque expo-router envuelve cada página en su propio Suspense con
// un fallback vacío: un Suspense nuestro alrededor del Stack nunca se activa.

import { router, type Href } from "expo-router";

type StartListener = (target: string | null) => void;
type Listener = () => void;
let startListener: StartListener | null = null;
let readyListener: Listener | null = null;
let currentPath = "/";

export function onNavStart(l: StartListener): () => void {
  startListener = l;
  return () => {
    if (startListener === l) startListener = null;
  };
}

export function onScreenReady(l: Listener): () => void {
  readyListener = l;
  return () => {
    if (readyListener === l) readyListener = null;
  };
}

/** Lo actualiza <NavSkeleton> con la ruta visible (para no esperar al navegar a la misma página). */
export function setCurrentPath(path: string) {
  currentPath = path;
}

/** Lo llama <Screen> al recibir el foco: la página nueva ya se ve. */
export function screenReady() {
  readyListener?.();
}

export function go(href: Href, mode: "navigate" | "push" | "replace" = "navigate") {
  const target = typeof href === "string" ? href : null;
  if (target !== currentPath) startListener?.(target);
  router[mode](href);
}

export function goBack() {
  startListener?.(null);
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

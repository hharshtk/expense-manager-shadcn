import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const isMobile = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return isMobile;
}

function getSnapshot() {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches;
}

function getServerSnapshot() {
  return false;
}

function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

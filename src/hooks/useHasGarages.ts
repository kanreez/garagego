import { useEffect, useSyncExternalStore } from "react";
import { useAuth } from "../context/AuthContext";
import { myGarages } from "../services/garages";

let hasGarages = false;
const listeners = new Set<() => void>();

export function setHasGarages(value: boolean) {
  if (value === hasGarages) return;
  hasGarages = value;
  listeners.forEach((l) => l());
}

export function refreshHasGarages() {
  return myGarages()
    .then((g) => setHasGarages(g.length > 0))
    .catch(() => {});
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useHasGarages() {
  const userId = useAuth().user?.id;
  useEffect(() => {
    if (userId) refreshHasGarages();
    else setHasGarages(false);
  }, [userId]);
  return useSyncExternalStore(subscribe, () => hasGarages, () => hasGarages);
}

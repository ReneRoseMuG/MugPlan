import { useEffect, useRef, useState, useCallback } from "react";

type DataVersion = {
  appointments: number;
  employees: number;
  projects: number;
  customers: number;
  notes: number;
};

const POLL_INTERVAL_MS = 30_000;

async function fetchDataVersion(): Promise<DataVersion | null> {
  try {
    const res = await fetch("/api/data-version", { credentials: "include" });
    if (!res.ok) return null;
    return (await res.json()) as DataVersion;
  } catch {
    return null;
  }
}

export function useDataVersionPoller() {
  const [isStale, setIsStale] = useState(false);
  const baselineRef = useRef<DataVersion | null>(null);

  const markAsSeen = useCallback(() => {
    setIsStale(false);
  }, []);

  const refreshBaseline = useCallback(async () => {
    const current = await fetchDataVersion();
    if (current) {
      baselineRef.current = current;
    }
  }, []);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function poll() {
      if (document.visibilityState !== "visible") return;
      const current = await fetchDataVersion();
      if (!current) return;

      if (baselineRef.current === null) {
        // Erster Aufruf: Baseline setzen, kein Banner
        baselineRef.current = current;
        return;
      }

      const baseline = baselineRef.current;
      const changed = (Object.keys(current) as (keyof DataVersion)[]).some(
        (key) => current[key] > baseline[key],
      );

      if (changed) {
        baselineRef.current = current;
        setIsStale(true);
      }
    }

    void poll();
    intervalId = setInterval(() => void poll(), POLL_INTERVAL_MS);

    return () => {
      if (intervalId !== null) clearInterval(intervalId);
    };
  }, []);

  return { isStale, markAsSeen, refreshBaseline };
}

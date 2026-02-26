const counters = new Map<string, number>();

export function nextDeterministicToken(namespace: string): string {
  const next = (counters.get(namespace) ?? 0) + 1;
  counters.set(namespace, next);
  return `${namespace}-${String(next).padStart(4, "0")}`;
}

export function resetDeterministicTokens(namespace?: string): void {
  if (namespace) {
    counters.delete(namespace);
    return;
  }
  counters.clear();
}

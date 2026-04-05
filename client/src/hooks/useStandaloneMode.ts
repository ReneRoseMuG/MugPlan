export function useStandaloneMode(): boolean {
  return typeof window !== "undefined" && window.location.pathname.startsWith("/standalone");
}

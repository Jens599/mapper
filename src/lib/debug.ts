export function mapperDebug(scope: string, message: string, details?: unknown) {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem("mapperDebug") !== "true") return;
  if (details === undefined) {
    console.debug(`[mapper:${scope}] ${message}`);
  } else {
    console.debug(`[mapper:${scope}] ${message}`, details);
  }
}

export function hexToLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function foregroundFromBackground(bg: string): string {
  return hexToLuminance(bg) > 0.45 ? "#18221d" : "#e9efeb";
}

export function mutedFromBackground(bg: string): string {
  return hexToLuminance(bg) > 0.45 ? "#d6dce4" : "#242e2b";
}

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

export function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
}

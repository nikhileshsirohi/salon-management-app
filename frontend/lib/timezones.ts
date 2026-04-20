const fallbackTimezones = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/London",
  "Europe/Paris",
  "Africa/Johannesburg",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Pacific/Auckland",
];

export function getTimezoneOptions() {
  const intlWithValues = Intl as typeof Intl & {
    supportedValuesOf?: (key: "timeZone") => string[];
  };
  const zones = intlWithValues.supportedValuesOf?.("timeZone") ?? fallbackTimezones;
  return Array.from(new Set(["Asia/Kolkata", ...zones])).sort((a, b) => a.localeCompare(b));
}

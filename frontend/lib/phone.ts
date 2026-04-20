export type CountryCodeOption = {
  code: string;
  country: string;
  sample: string;
};

export const DEFAULT_COUNTRY_CODE = "+91";
export const DEFAULT_PHONE_PREFIX = `${DEFAULT_COUNTRY_CODE} `;

export const COUNTRY_CODE_OPTIONS: CountryCodeOption[] = [
  { code: "+91", country: "India", sample: "9876543210" },
  { code: "+1", country: "United States", sample: "4155550100" },
  { code: "+44", country: "United Kingdom", sample: "7400123456" },
  { code: "+61", country: "Australia", sample: "412345678" },
  { code: "+65", country: "Singapore", sample: "81234567" },
  { code: "+971", country: "UAE", sample: "501234567" },
  { code: "+977", country: "Nepal", sample: "9841234567" },
  { code: "+880", country: "Bangladesh", sample: "1712345678" },
];

export function normalizePhoneNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (COUNTRY_CODE_OPTIONS.some((option) => option.code === trimmed)) return "";

  if (trimmed.startsWith("+")) {
    return `+${trimmed.slice(1).replace(/\D/g, "")}`;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+91${digits}`;
  }

  return `+${digits}`;
}

export function getCountryCodeFromPhone(value?: string | null) {
  const normalized = normalizePhoneNumber(value ?? "");
  return (
    [...COUNTRY_CODE_OPTIONS]
      .sort((a, b) => b.code.length - a.code.length)
      .find((option) => normalized.startsWith(option.code))?.code ?? DEFAULT_COUNTRY_CODE
  );
}

export function getNationalPhoneNumber(value?: string | null) {
  const normalized = normalizePhoneNumber(value ?? "");
  const countryCode = getCountryCodeFromPhone(normalized);
  return normalized.startsWith(countryCode) ? normalized.slice(countryCode.length) : normalized.replace(/^\+/, "");
}

export function combinePhoneNumber(countryCode: string, nationalNumber: string) {
  const digits = nationalNumber.replace(/\D/g, "");
  return digits ? `${countryCode}${digits}` : countryCode;
}

export function isValidPhoneNumber(value: string) {
  return /^\+[1-9]\d{7,14}$/.test(normalizePhoneNumber(value));
}

export function phoneValidationMessage(label = "Phone") {
  return `${label} must include a country code and a valid number, for example +91 9876543210.`;
}

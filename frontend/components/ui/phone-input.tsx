"use client";

import {
  COUNTRY_CODE_OPTIONS,
  combinePhoneNumber,
  getCountryCodeFromPhone,
  getNationalPhoneNumber,
} from "@/lib/phone";

type PhoneInputProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

export function PhoneInput({ label = "Phone", value, onChange, required = false }: PhoneInputProps) {
  const countryCode = getCountryCodeFromPhone(value);
  const nationalNumber = getNationalPhoneNumber(value);
  const selectedCountry =
    COUNTRY_CODE_OPTIONS.find((option) => option.code === countryCode) ?? COUNTRY_CODE_OPTIONS[0];

  return (
    <div className="field">
      <label>{label}</label>
      <div className="row" style={{ alignItems: "stretch", flexWrap: "nowrap", gap: 8 }}>
        <select
          aria-label={`${label} country code`}
          value={countryCode}
          onChange={(event) => onChange(combinePhoneNumber(event.target.value, nationalNumber))}
          style={{ flex: "0 0 76px", minWidth: 76 }}
        >
          {COUNTRY_CODE_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>
              {option.code} {option.country}
            </option>
          ))}
        </select>
        <input
          aria-label={label}
          inputMode="tel"
          placeholder={selectedCountry.sample}
          required={required}
          type="tel"
          value={nationalNumber}
          onChange={(event) => onChange(combinePhoneNumber(countryCode, event.target.value))}
          style={{ flex: "1 1 180px", minWidth: 0 }}
        />
      </div>
    </div>
  );
}

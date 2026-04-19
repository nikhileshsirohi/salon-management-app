"use client";

import { useState } from "react";

type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
};

export function PasswordField({
  label,
  value,
  onChange,
  required = false,
  minLength,
  placeholder,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="field">
      <label>{label}</label>
      <div className="password-control">
        <input
          minLength={minLength}
          placeholder={placeholder}
          required={required}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button className="text-button password-toggle" onClick={() => setShowPassword((current) => !current)} type="button">
          {showPassword ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}

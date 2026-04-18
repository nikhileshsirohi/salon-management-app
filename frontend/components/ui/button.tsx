import { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-lg bg-teal px-4 py-2 font-semibold text-white disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}

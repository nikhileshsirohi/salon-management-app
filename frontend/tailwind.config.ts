import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1a1512",
        cream: "#fbf8f4",
        paper: "#ffffff",
        muted: "#7a6e66",
        line: "#ebe1d4",
        rose: "#b57564",
        clay: "#c99b8a",
        gold: "#b8864d",
        plum: "#7a3b4d",
        moss: "#3f5f4a",
      },
      fontFamily: {
        serif: ["var(--font-display)", "Playfair Display", "serif"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 8px 24px rgba(26, 21, 18, 0.06)",
        lift: "0 20px 50px rgba(26, 21, 18, 0.12)",
        glow: "0 18px 40px rgba(181, 117, 100, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;

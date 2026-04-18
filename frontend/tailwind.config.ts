import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#18181b",
        mist: "#f4f4f5",
        coral: "#e85d75",
        teal: "#0f766e",
      },
    },
  },
  plugins: [],
};

export default config;

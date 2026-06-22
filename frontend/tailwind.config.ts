import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        mkt: {
          primary: "var(--mkt-primary)",
          "primary-dark": "var(--mkt-primary-dark)",
          "primary-light": "var(--mkt-primary-light)",
          accent: "var(--mkt-accent)",
          "accent-hover": "var(--mkt-accent-hover)",
          text: "var(--mkt-text)",
          "text-muted": "var(--mkt-text-muted)",
          "text-subtle": "var(--mkt-text-subtle)",
          surface: "var(--mkt-surface)",
          "surface-alt": "var(--mkt-surface-alt)",
          "surface-warm": "var(--mkt-surface-warm)",
          "surface-accent-tint": "var(--mkt-surface-accent-tint)",
          "surface-primary-tint": "var(--mkt-surface-primary-tint)",
          "surface-accent-strong": "var(--mkt-surface-accent-strong)",
          border: "var(--mkt-border)",
          footer: "var(--mkt-footer-bg)",
        },
      },
      borderRadius: {
        mkt: "var(--mkt-radius-card)",
      },
      boxShadow: {
        mkt: "var(--mkt-shadow-card)",
        "mkt-hover": "var(--mkt-shadow-card-hover)",
        "mkt-cta": "var(--mkt-shadow-cta)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      keyframes: {
        "sheet-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "page-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "sheet-up": "sheet-up 0.25s ease-out",
        "page-in": "page-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;

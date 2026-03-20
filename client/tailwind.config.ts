import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["var(--pf-font-heading)"],
        body: ["var(--pf-font-body)"],
        mono: ["var(--pf-font-mono)"],
      },
      colors: {
        pf: {
          "bg-primary": "var(--pf-bg-primary)",
          "bg-secondary": "var(--pf-bg-secondary)",
          "bg-card": "var(--pf-bg-card)",
          "bg-nav": "var(--pf-bg-nav)",
          "text-primary": "var(--pf-text-primary)",
          "text-secondary": "var(--pf-text-secondary)",
          gold: "var(--pf-accent-gold)",
          coral: "var(--pf-status-needs-work)",
          emerald: "var(--pf-status-ready)",
          blue: "var(--pf-status-in-progress)",
          lavender: "var(--pf-accent-lavender)",
          teal: "var(--pf-accent-teal)",
          orange: "var(--pf-accent-orange)",
        },
      },
      borderRadius: {
        pf: "var(--pf-radius-md)",
        "pf-sm": "var(--pf-radius-sm)",
        "pf-lg": "var(--pf-radius-lg)",
      },
      boxShadow: {
        pf: "var(--pf-shadow-card)",
        "pf-lg": "var(--pf-shadow-lg)",
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          DEFAULT: "#6366f1",
          700: "#6366f1",
          800: "#4f46e5",
          900: "#4338ca",
          950: "#2e1065",
        },
        accent: {
          DEFAULT: "#f59e0b",
          light:   "#fef3c7",
          dark:    "#d97706",
        },
        success: {
          DEFAULT: "#10b981",
          light:   "#d1fae5",
        },
        danger: {
          DEFAULT: "#ef4444",
          light:   "#fee2e2",
        },
        // Semantic surface tokens (map to CSS vars in globals.css)
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "app-border": "var(--border)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        card: "14px",
        xl2: "20px",
        xl3: "28px",
      },
      boxShadow: {
        card:  "0 1px 3px rgba(15,23,42,0.06), 0 4px 20px rgba(99,102,241,0.07)",
        hover: "0 4px 8px rgba(15,23,42,0.08), 0 12px 32px rgba(99,102,241,0.14)",
        brand: "0 4px 16px rgba(99,102,241,0.35)",
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
      animation: {
        "fade-up": "fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1) both",
        shimmer:   "shimmer 1.4s ease infinite",
      },
    },
  },
  plugins: [],
};

export default config;

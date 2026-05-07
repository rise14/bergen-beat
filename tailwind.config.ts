import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f0f2fb",
          100: "#dde2f4",
          500: "#5f6aa8",
          600: "#3355ba",
          700: "#2845a0",
          900: "#192a5e",
        },
        navy: {
          50:  "#f0f3fa",
          600: "#2d4d8f",
          700: "#253f78",
          800: "#1a2e5a",
          900: "#0f1d3a",
        },
        cream: {
          DEFAULT: "#fdf4eb",
          50:      "#fef9f3",
          100:     "#f5e6d0",
          200:     "#e2c9a8",
        },
        walnut: {
          DEFAULT: "#7c4f2a",
          light:   "#a06a3b",
        },
        sky: {
          light: "#b8cee6",
          DEFAULT: "#8fabd4",
        },
        accent: {
          mauve:  "#897993",
          rose:   "#b28579",
          orange: "#dc8f53",
        },
      },
      fontFamily: {
        sans:  ["var(--font-sans)",  "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia",   "serif"],
      },
    },
  },
  plugins: [],
};

export default config;

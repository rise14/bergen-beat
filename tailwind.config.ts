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
        // Bergen Beat brand palette
        brand: {
          50:  "#f0f2fb",  // very light tint of primary
          100: "#dde2f4",  // light tint
          500: "#5f6aa8",  // medium blue-purple
          600: "#3355ba",  // primary
          700: "#2845a0",  // hover / darker primary
          900: "#192a5e",  // deep dark
        },
        // Warm accent palette
        accent: {
          mauve:  "#897993",
          rose:   "#b28579",
          orange: "#dc8f53",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

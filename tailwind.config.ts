import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#0F3D4D",
          "navy-700": "#0A2C38",
          cyan: "#1FC2DD",
          "cyan-600": "#15A6BE",
          "cyan-50": "#E7F8FC",
        },
        ink: "#13212B",
        muted: "#5B6B73",
        line: "#E2E8EC",
        canvas: "#F6F9FA",
      },
      borderRadius: { card: "0.75rem" },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
} satisfies Config;

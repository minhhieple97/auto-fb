import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#18212f",
        canvas: "#f7f8fa",
        line: "#d9dee7",
        action: "#0f766e",
        warn: "#b45309"
      }
    }
  },
  plugins: []
} satisfies Config;

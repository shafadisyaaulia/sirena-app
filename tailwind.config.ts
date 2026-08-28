import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sirena: {
          navy: "#1e3a5f",
          teal: "#1f7a6c",
          orange: "#c05621",
        },
      },
    },
  },
  plugins: [],
};
export default config;

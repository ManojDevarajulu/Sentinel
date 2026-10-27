/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0b",
        bg2: "#111114",
        bg3: "#18181d",
        border: "#222228",
        border2: "#2e2e38",
        accent: "#e8ff47",
        textMain: "#f0f0f2",
        textMuted: "#8888a0",
        textSub: "#55556a",
      },
      fontFamily: {
        head: ["Syne", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

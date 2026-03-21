/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // LinguaQuest pirate theme palette
        ocean: {
          deep: "#1a1a2e",
          mid: "#16213e",
          light: "#0f3460",
        },
        gold: {
          DEFAULT: "#f5c518",
          light: "#ffd700",
          dark: "#c8a415",
        },
        coral: {
          DEFAULT: "#e94560",
          light: "#ff6b8a",
        },
        parchment: {
          DEFAULT: "#f4e4c1",
          dark: "#d4b896",
        },
        ship: {
          hull: "#8b4513",
          mast: "#a0522d",
          sails: "#f5f5dc",
          anchor: "#808080",
          rudder: "#654321",
        },
      },
      fontFamily: {
        pirate: ["Pirate", "serif"],
        quest: ["QuestFont", "sans-serif"],
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}", "./src/sidepanel/index.html"],
  theme: {
    extend: {
      colors: {
        primary: "#1B3A5C",
        accent: "#2E75B6",
        light: "#D5E8F0",
        success: "#2E8B57",
        warning: "#D4790E",
        danger: "#CC0000",
        purple: "#6B4FA0",
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // ADICIONE/ALTERE ESTA LINHA
  darkMode: 'class', 
  theme: {
    extend: {},
  },
  plugins: [],
}
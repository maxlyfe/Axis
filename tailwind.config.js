/** @type {import('tailwindcss').Config} */
export default {
  // AQUI ESTÁ A MUDANÇA: Habilita o modo escuro baseado em uma classe no HTML.
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}


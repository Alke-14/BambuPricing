/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bambu: {
          50: '#ecfdf3',
          100: '#d1fae1',
          200: '#a7f3c6',
          300: '#6ee7a3',
          400: '#34d37a',
          500: '#00ae42', // Bambu signature green
          600: '#009738',
          700: '#00772e',
          800: '#065e27',
          900: '#074e22',
          950: '#022c12',
        }
      }
    },
  },
  plugins: [],
}

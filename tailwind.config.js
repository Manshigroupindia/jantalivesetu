/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fb',
          400: '#36a9f7',
          500: '#0c8ce9',
          600: '#006ec7',
          700: '#0158a3',
          800: '#064b86',
          900: '#0b3f6f',
          950: '#072849',
        },
      },
    },
  },
  plugins: [],
};

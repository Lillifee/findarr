/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      spacing: {
        75: '300px',
        45: '180px',
        15: '60px', // For poster heights
        18: '72px',
      },
      zIndex: {
        1000: '1000',
      },
      aspectRatio: {
        '2/3': '2 / 3',
      },
    },
  },
  plugins: [],
};

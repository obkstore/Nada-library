/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Arabic-first: Cairo; Latin: Nunito. Applied via html[lang] selector in index.css.
        cairo: ['Cairo', 'Nunito', 'system-ui', 'sans-serif'],
        nunito: ['Nunito', 'Cairo', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#fef9ec',
          100: '#fdf0d3',
          200: '#fbe0a5',
          300: '#f8ca6d',
          400: '#f5b134',
          500: '#f39c0c',
          600: '#d77d07',
        },
      },
    },
  },
  plugins: [],
};

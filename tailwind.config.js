/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', './plugins/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: {
          950: 'rgb(var(--c-slate-950) / <alpha-value>)',
          900: 'rgb(var(--c-slate-900) / <alpha-value>)',
          800: 'rgb(var(--c-slate-800) / <alpha-value>)',
          700: 'rgb(var(--c-slate-700) / <alpha-value>)',
          600: 'rgb(var(--c-slate-600) / <alpha-value>)',
          500: 'rgb(var(--c-slate-500) / <alpha-value>)',
          400: 'rgb(var(--c-slate-400) / <alpha-value>)',
          300: 'rgb(var(--c-slate-300) / <alpha-value>)',
          200: 'rgb(var(--c-slate-200) / <alpha-value>)',
          100: 'rgb(var(--c-slate-100) / <alpha-value>)',
        },
        blue: {
          700: 'rgb(var(--c-blue-700) / <alpha-value>)',
          600: 'rgb(var(--c-blue-600) / <alpha-value>)',
          500: 'rgb(var(--c-blue-500) / <alpha-value>)',
          400: 'rgb(var(--c-blue-400) / <alpha-value>)',
          300: 'rgb(var(--c-blue-300) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
}

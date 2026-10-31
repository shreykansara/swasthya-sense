/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        page: 'var(--page)',
        gmin: 'var(--gmin)',
        gmaj: 'var(--gmaj)',
        panel: 'var(--panel)',
        ink: 'var(--ink)',
        mut: 'var(--mut)',
        acc: 'var(--acc)',
        onacc: 'var(--onacc)',
        bd: 'var(--bd)',
        bds: 'var(--bds)',
        hov: 'var(--hov)',
        low: 'var(--low)',
        mod: 'var(--mod)',
        high: 'var(--high)',
        sheet: 'var(--sheet)',
        sheetink: 'var(--sheetink)',
        sheetmut: 'var(--sheetmut)',
        sbd: 'var(--sbd)',
      },
      fontFamily: {
        sans: ['var(--fs)', 'system-ui', 'sans-serif'],
        mono: ['var(--fm)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm: 'var(--radius)',
        md: 'var(--radius)',
        lg: 'var(--radius)',
      },
    },
  },
  plugins: [],
};

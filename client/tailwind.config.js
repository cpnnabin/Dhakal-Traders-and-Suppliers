/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        invoice: {
          ink: '#111827',
          muted: '#6b7280',
          line: '#d1d5db',
          soft: '#f8fafc',
        },
      },
      boxShadow: {
        invoice: '0 10px 30px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};

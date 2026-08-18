/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'rc-teal': '#0B5E4E',
        'rc-teal-dark': '#064035',
        'rc-teal-light': 'rgba(7,163,178,0.5)',
      },
      backgroundImage: {
        'rc-gradient': 'linear-gradient(135deg, #f0f3f6 0%, #e2e8f0 100%)',
        'rc-dashboard': 'linear-gradient(135deg, rgba(7,163,178,0.5) 0%, rgba(217,236,199,0.9) 100%)',
        'rc-section': 'linear-gradient(90deg, #CBD5E1 0%, #6EE7B7 100%)',
      },
      boxShadow: {
        rc: '0 4px 16px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
};

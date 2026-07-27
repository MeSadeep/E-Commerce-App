/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0A0F1E',        // deep navy-black — primary text, nav/footer/hero bg
        paper: '#F7F9FC',      // cool off-white — page bg
        accent: {              // cyan — primary brand accent (was "brass"/amber)
          50: '#ECFEFF',
          100: '#CFFAFE',
          300: '#67E8F9',
          500: '#22D3EE',
          600: '#0E7490',
          800: '#164E63',
        },
        flash: {               // orange — used sparingly for specific CTA moments
          500: '#F97316',      // (Login button, hero button icon) per the Figma reference
          600: '#EA580C',
        },
        line: '#E2E8F0',       // cool-toned hairline borders on paper
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.75rem',
      },
    },
  },
  plugins: [],
};

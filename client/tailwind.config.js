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
          100: '#CAD2C5',
          300: '#84A98C',
          500: '#52796F',
          600: '#354F52',
          800: '#2F3E46',
        },
        flash: {               // orange — used sparingly for specific CTA moments
          500: '#FFA62B',      // (Login button, hero button icon) per the Figma reference
          600: '#EA580C',
        },
        line: '#E2E8F0',       // cool-toned hairline borders on paper
      },
      fontFamily: {
        display: ['"Playwrite DE Grund"', 'cursive'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.75rem',
      },
    },
  },
  plugins: [],
};

module.exports = {
  darkMode: 'class',
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#1e1b4b',   // Fondo oscuro profundo
          purple: '#7c3aed', // Purpura principal (Duolingo)
          blue: '#06b6d4',   // Azul eléctrico (Discord)
          accent: '#f472b6', // Rosa/Rojo para alertas
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
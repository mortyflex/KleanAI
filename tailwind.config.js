/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#7C6EFA",
          50: "#F0EEFF",
          100: "#E4DEFF",
        },
        energy: {
          DEFAULT: "#FF6860",
          50: "#FFF0EF",
          100: "#FFD8D6",
        },
        mint: {
          DEFAULT: "#4EC994",
          50: "#EDFAF3",
          100: "#C5EFD9",
        },
        sky: {
          DEFAULT: "#56B4E9",
          50: "#EBF6FF",
        },
        amber: {
          DEFAULT: "#F59E0B",
          50: "#FFFBEB",
        },
        bg: "#F5F2EE",
        card: "#FFFFFF",
        ink: "#1A1826",
        muted: "#9896A8",
        border: "#EDEAEB",
      },
      borderRadius: {
        "4xl": "28px",
      },
      fontFamily: {
        // Source of truth for font families lives in src/theme/typography.ts.
        // These tokens mirror it for utility-class consumers.
        sans: ["PlusJakartaSans_400Regular", "System"],
        medium: ["PlusJakartaSans_500Medium", "System"],
        semibold: ["PlusJakartaSans_600SemiBold", "System"],
        bold: ["PlusJakartaSans_700Bold", "System"],
        extrabold: ["PlusJakartaSans_800ExtraBold", "System"],
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */

// Every color is a CSS variable holding an "R G B" triple, so Tailwind
// opacity modifiers (bg-card/60) keep working against themed values.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: token("bg"),
        card: token("card"),
        foreground: token("fg"),
        muted: { DEFAULT: token("muted"), foreground: token("muted-fg") },
        border: token("border"),
        input: { DEFAULT: token("input"), border: token("input-border") },
        accent: token("accent"),
        overlay: token("overlay"),
        primary: {
          DEFAULT: token("primary"),
          foreground: token("primary-fg"),
          hover: token("primary-hover"),
        },
        secondary: { DEFAULT: token("secondary"), foreground: token("secondary-fg") },
        destructive: { DEFAULT: token("danger"), foreground: token("danger-fg") },
      },
      fontFamily: {
        sans: ["Inter_400Regular"],
        medium: ["Inter_500Medium"],
        semibold: ["Inter_600SemiBold"],
        bold: ["Inter_700Bold"],
      },
    },
  },
  plugins: [],
};

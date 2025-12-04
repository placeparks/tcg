import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        display: ['var(--font-display)', 'sans-serif'],
      },
      colors: {
        mint: "#00d9a1",
        "neon-purple": "#b026ff", // Brighter purple
        "neon-cyan": "#00f3ff",   // Brighter cyan
        "neon-pink": "#ff0099",
        "neon-blue": "#0066ff",
        "neon-yellow": "#faff00", // New cyberpunk yellow
        "dark-bg": "#050505",     // Darker black
        "card-bg": "rgba(255, 255, 255, 0.03)",
        "card-border": "rgba(176, 38, 255, 0.3)",
      },
      backgroundImage: {
        "cyber-grid": "linear-gradient(to right, rgba(176, 38, 255, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(176, 38, 255, 0.1) 1px, transparent 1px)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 8s linear infinite",
        "glitch": "glitch 1s linear infinite",
        "float": "float 4s ease-in-out infinite",
        "float-delayed": "float 4s ease-in-out 2s infinite",
      },
      keyframes: {
        glitch: {
          "2%, 64%": { transform: "translate(2px,0) skew(0deg)" },
          "4%, 60%": { transform: "translate(-2px,0) skew(0deg)" },
          "62%": { transform: "translate(0,0) skew(5deg)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-15px)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;

/** @type {import('tailwindcss').Config} */

// Every value here maps to a CSS custom property declared in globals.css, so
// theming happens in one place and components only ever name a token.
module.exports = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "var(--color-canvas)",
          veil: "var(--color-canvas-veil)",
        },
        surface: {
          DEFAULT: "var(--color-surface)",
          subtle: "var(--color-surface-subtle)",
          hover: "var(--color-surface-hover)",
          raised: "var(--color-surface-raised)",
          veil: "var(--color-surface-veil)",
        },
        line: {
          DEFAULT: "var(--color-border)",
          subtle: "var(--color-border-subtle)",
          strong: "var(--color-border-strong)",
        },
        grid: "var(--color-grid)",
        axis: "var(--color-axis)",
        ink: {
          DEFAULT: "var(--color-ink)",
          secondary: "var(--color-ink-secondary)",
          muted: "var(--color-ink-muted)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          hover: "var(--color-accent-hover)",
          active: "var(--color-accent-active)",
          ink: "var(--color-accent-ink)",
          text: "var(--color-accent-text)",
          soft: "var(--color-accent-soft)",
          line: "var(--color-accent-line)",
        },
        positive: {
          DEFAULT: "var(--color-positive)",
          soft: "var(--color-positive-soft)",
          line: "var(--color-positive-line)",
        },
        negative: {
          DEFAULT: "var(--color-negative)",
          soft: "var(--color-negative-soft)",
          line: "var(--color-negative-line)",
          // Stronger edge for an invalid form control
          edge: "var(--color-negative-edge)",
        },
        sheen: "var(--color-sheen)",
        series: {
          1: "var(--color-series-1)",
          2: "var(--color-series-2)",
          3: "var(--color-series-3)",
          other: "var(--color-series-other)",
        },
        focus: "var(--color-focus)",
      },

      // Optical scale: line-height tightens and tracking goes negative as size
      // grows, so headings stay dense and body copy stays readable.
      fontSize: {
        micro: ["0.625rem", { lineHeight: "0.875rem", letterSpacing: "0.07em" }],
        "2xs": ["0.6875rem", { lineHeight: "0.9375rem", letterSpacing: "0.055em" }],
        xs: ["0.75rem", { lineHeight: "1.0625rem" }],
        sm: ["0.8125rem", { lineHeight: "1.1875rem" }],
        base: ["0.875rem", { lineHeight: "1.3125rem" }],
        md: ["0.9375rem", { lineHeight: "1.375rem", letterSpacing: "-0.004em" }],
        lg: ["1.0625rem", { lineHeight: "1.5rem", letterSpacing: "-0.008em" }],
        xl: ["1.1875rem", { lineHeight: "1.625rem", letterSpacing: "-0.014em" }],
        "2xl": ["1.4375rem", { lineHeight: "1.75rem", letterSpacing: "-0.019em" }],
        "3xl": ["1.75rem", { lineHeight: "2.0625rem", letterSpacing: "-0.023em" }],
        "4xl": ["2.125rem", { lineHeight: "2.375rem", letterSpacing: "-0.026em" }],
        "5xl": ["2.75rem", { lineHeight: "2.9375rem", letterSpacing: "-0.03em" }],
      },

      fontFamily: {
        sans: [
          // Injected by next/font in pages/_app.tsx
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
          "Apple Color Emoji",
          "Segoe UI Emoji",
        ],
      },

      // Tightened one step across the board. 16px panels read as a consumer
      // app; 12px reads as an instrument.
      borderRadius: {
        sm: "0.25rem",
        DEFAULT: "0.375rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.625rem",
        "2xl": "0.75rem",
        "3xl": "0.875rem",
      },

      boxShadow: {
        xs: "var(--shadow-xs)",
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        pop: "var(--shadow-pop)",
        modal: "var(--shadow-modal)",
      },

      spacing: {
        // Semantic rhythm tokens — page gutters and the gap between panels.
        gutter: "0.875rem",
        "gutter-md": "1.25rem",
        "gutter-lg": "1.5rem",
        section: "0.75rem",
        "section-lg": "1rem",
      },

      maxWidth: {
        shell: "90rem",
        /** The workspace's optional reading cap — content is otherwise full-bleed. */
        prose: "34rem",
      },

      width: {
        /** Left sidebar. Wide enough for a label + icon, narrow enough that the
         *  workspace keeps the screen. */
        sidebar: "13.5rem",
      },

      transitionTimingFunction: {
        // Matches lib/motion.ts so CSS and Framer Motion move identically
        out: "cubic-bezier(0.16, 1, 0.3, 1)",
        "in-out": "cubic-bezier(0.65, 0, 0.35, 1)",
      },

      transitionDuration: {
        fast: "120ms",
        base: "180ms",
        slow: "280ms",
      },

      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },

      animation: {
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
};

export const COLORS = {
  primary: {
    DEFAULT: "#c8ad68",
    50: "#f8f3e5",
    100: "#f0e7cb",
    200: "#e2cd97",
    300: "#d3b362",
    400: "#c8ad68",
    500: "#b59357",
    600: "#8f7345",
    700: "#695533",
    800: "#433722",
    900: "#1e1a11",
  },
  gray: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
  },
} as const;

export const SHADOWS = {
  sm: "0 1px 2px rgba(0,0,0,0.05)",
  md: "0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06)",
} as const;

export const BREAKPOINTS = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
} as const;

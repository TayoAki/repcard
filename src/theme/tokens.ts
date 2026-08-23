import { vars } from "nativewind";

/**
 * RepCard palette. Emerald brand on a slate-neutral base.
 * Values are hex here; converted to "R G B" triples for CSS variables so
 * Tailwind alpha modifiers work (see tailwind.config.js).
 */
const brand = {
  primary: "#10B981",
  primaryFg: "#052E22",
  primaryHover: "#059669",
  danger: "#EF4444",
  dangerFg: "#FFFFFF",
} as const;

export const palette = {
  light: {
    ...brand,
    bg: "#F7F8F8",
    card: "#FFFFFF",
    fg: "#0B1220",
    muted: "#EEF1F1",
    mutedFg: "#5C6B70",
    border: "#E3E8E8",
    input: "#FFFFFF",
    inputBorder: "#DCE3E3",
    accent: "#E7F8F1",
    overlay: "#0B1220",
    secondary: "#EEF1F1",
    secondaryFg: "#0B1220",
  },
  dark: {
    ...brand,
    primaryFg: "#022C22",
    bg: "#0A0F0D",
    card: "#131A17",
    fg: "#F4F7F6",
    muted: "#1A2320",
    mutedFg: "#8FA39C",
    border: "#22302B",
    input: "#131A17",
    inputBorder: "#2B3B35",
    accent: "#10B981",
    overlay: "#000000",
    secondary: "#1A2320",
    secondaryFg: "#F4F7F6",
  },
} as const;

export type Scheme = keyof typeof palette;
export type TokenName = keyof (typeof palette)["light"];

const triple = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

/** kebab-cases a camelCase token: mutedFg -> muted-fg */
const cssName = (t: string) => t.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const toVars = (scheme: Scheme) =>
  vars(
    Object.fromEntries(
      Object.entries(palette[scheme]).map(([k, v]) => [`--${cssName(k)}`, triple(v)]),
    ),
  );

export const themeVars = { light: toVars("light"), dark: toVars("dark") };

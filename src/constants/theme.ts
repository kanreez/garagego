const light = {
  background: "#EDEBE4",
  surface: "#F8F7F3",
  sand: "#E2DFD5",
  border: "#CFCBC0",
  ink: "#23272B",
  inkSoft: "#3B4046",
  onInk: "#F8F7F3",
  textMuted: "#5B6067",
  accent: "#23272B",
  accentSoft: "#E4E1D8",
  accentDeep: "#23272B",
  onAccent: "#F8F7F3",
  cta: "#E2A23A",
  ctaPressed: "#C98D2C",
  onCta: "#23272B",
  success: "#2F7A58",
  successSoft: "#DCEDE3",
  error: "#A93A2E",
  errorSoft: "#F4DFDA",
  errorText: "#9C3327",
  white: "#FFFFFF",
  plate: "#FFFFFF",
  field: "#FFFFFF",
};

const dark: Palette = {
  background: "#16181B",
  surface: "#1F2226",
  sand: "#2A2E33",
  border: "#3A3F46",
  ink: "#ECEAE4",
  inkSoft: "#C8C5BD",
  onInk: "#16181B",
  textMuted: "#A0A5AC",
  accent: "#ECEAE4",
  accentSoft: "#2C3035",
  accentDeep: "#ECEAE4",
  onAccent: "#16181B",
  cta: "#E2A23A",
  ctaPressed: "#F0B24A",
  onCta: "#23272B",
  success: "#5DBB8E",
  successSoft: "#1D3A2D",
  error: "#E5675A",
  errorSoft: "#3E2420",
  errorText: "#F28B7E",
  white: "#FFFFFF",
  plate: "#FFFFFF",
  field: "#1A1D21",
};

export type Palette = { [K in keyof typeof light]: string };
export type Scheme = "light" | "dark";

export const colors: Palette = { ...light };

export const doorPaints = [
  "#4E8576",
  "#A8702A",
  "#9A4236",
  "#4A729C",
  "#6D7342",
  "#6B587C",
] as const;

export function doorPaint(id: string | null | undefined) {
  let h = 0;
  for (const ch of id ?? "") h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return doorPaints[h % doorPaints.length];
}

const shadows = {
  light: {
    card: {},
    float: { boxShadow: "0px 10px 28px rgba(35, 39, 43, 0.16)" },
    glow: { boxShadow: "0px 6px 16px rgba(168, 112, 42, 0.28)" },
  },
  dark: {
    card: {},
    float: { boxShadow: "0px 10px 28px rgba(0, 0, 0, 0.5)" },
    glow: { boxShadow: "0px 6px 16px rgba(226, 162, 58, 0.25)" },
  },
};

export const shadow: { card: object; float: object; glow: object } = { ...shadows.light };

let themeVersion = 0;
export let scheme: Scheme = "light";

export function applyScheme(next: Scheme) {
  if (next === scheme) return;
  scheme = next;
  Object.assign(colors, next === "dark" ? dark : light);
  Object.assign(shadow, shadows[next]);
  themeVersion++;
}

export function themed<T extends object>(make: () => T): T {
  let built: T | null = null;
  let builtAt = -1;
  const current = () => {
    if (builtAt !== themeVersion || !built) {
      built = make();
      builtAt = themeVersion;
    }
    return built;
  };
  return new Proxy({} as T, {
    get: (_t, key) => (current() as any)[key],
    has: (_t, key) => key in current(),
    ownKeys: () => Reflect.ownKeys(current()),
    getOwnPropertyDescriptor: (_t, key) => Object.getOwnPropertyDescriptor(current(), key),
  });
}

export const fonts = {
  regular: "Rubik_400Regular",
  medium: "Rubik_500Medium",
  semibold: "Rubik_600SemiBold",
  bold: "Rubik_700Bold",
  heavy: "Rubik_800ExtraBold",
  stencil: "Oswald_700Bold",
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const radius = { sm: 4, md: 8, lg: 12, xl: 16, pill: 999 } as const;

const tabular = { fontVariant: ["tabular-nums"] as ("tabular-nums")[] };

export const typography = {
  display: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 36, letterSpacing: -0.6 },
  h1: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 30, letterSpacing: -0.4 },
  h2: { fontFamily: fonts.semibold, fontSize: 19, lineHeight: 24, letterSpacing: -0.2 },
  h3: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 21 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  subline: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 },
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 18 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 17 },
  eyebrow: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  figure: { fontFamily: fonts.bold, fontSize: 40, lineHeight: 44, letterSpacing: -0.8, ...tabular },
  figureSm: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 26, letterSpacing: -0.3, ...tabular },
  stencil: { fontFamily: fonts.stencil, letterSpacing: 1 },
  tabular,
} as const;

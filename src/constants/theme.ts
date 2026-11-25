// Design tokens: "Garage rows" (see DESIGN.md). Re-skin the whole app by editing this file.
// Light concrete ground and graphite ink, like the rows of painted metal garages behind the panel
// blocks. The door paints are the only saturated colours: every garage keeps one door colour for
// good (doorPaint below). Ochre is the one action colour. Every text/background pair passes WCAG AA.

export const colors = {
  background: "#EDEBE4", // concrete: app ground
  surface: "#F8F7F3", // whitewash: rows, sheets, tab bar
  sand: "#E2DFD5", // raised: inputs, quiet buttons, empty thumbs (name kept for old code)
  border: "#CFCBC0", // hairlines, input borders, door frame
  ink: "#23272B", // graphite: main text (13.0:1 on concrete); also the fill of "primary" buttons
  inkSoft: "#3B4046", // pressed primary
  onInk: "#F8F7F3", // text/icons on a graphite fill
  textMuted: "#5B6067", // hints, captions (5.4:1 on concrete, 4.9:1 on raised)
  // Selection and chrome are graphite, not a brand colour: saturated colour belongs to the doors
  // and the ochre action only (names kept for old code)
  accent: "#23272B", // active tab, selected chips, step dots, focus
  accentSoft: "#E4E1D8", // selected tiles, info strips: a step darker than concrete
  accentDeep: "#23272B", // links and emphasised notes
  onAccent: "#F8F7F3", // text/icons on graphite
  cta: "#E2A23A", // ochre door paint: Open, and the one forward button per screen
  ctaPressed: "#C98D2C",
  onCta: "#23272B", // text/icons on ochre (7.2:1)
  success: "#2F7A58",
  successSoft: "#DCEDE3",
  error: "#A93A2E", // oxide red fill, white text on it (6.0:1)
  errorSoft: "#F4DFDA",
  errorText: "#9C3327", // red text on the light ground
  white: "#FFFFFF", // logo glyph, text on paint and the error fill
  plate: "#FFFFFF", // number-plate white for the "What I understood" strips
} as const;

// Door paints, deepened from the faded originals so a stencilled letter in white reads on them
// (large text, ≥3:1). Order matters: doorPaint() picks by a stable hash of the garage id.
export const doorPaints = [
  "#4E8576", // mint
  "#A8702A", // ochre
  "#9A4236", // oxide red
  "#4A729C", // sky
  "#6D7342", // olive
  "#6B587C", // plum
] as const;

// One garage, one door colour, on every screen and every visit
export function doorPaint(id: string | null | undefined) {
  let h = 0;
  for (const ch of id ?? "") h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return doorPaints[h % doorPaints.length];
}

// Flat by default: hierarchy comes from surface steps, hairlines and spacing. Only floating things
// (tab bar, toasts, sheets) get depth; the ochre Open control gets a soft, offset lift.
export const shadow = {
  card: {},
  float: { boxShadow: "0px 10px 28px rgba(35, 39, 43, 0.16)" },
  glow: { boxShadow: "0px 6px 16px rgba(168, 112, 42, 0.28)" }, // the Open control only
} as const;

// Loaded in src/app/_layout.tsx. Change the families there and here together.
// Rubik carries every word (full Cyrillic); Oswald is only the stencil on the doors.
export const fonts = {
  regular: "Rubik_400Regular",
  medium: "Rubik_500Medium",
  semibold: "Rubik_600SemiBold",
  bold: "Rubik_700Bold",
  heavy: "Rubik_800ExtraBold",
  stencil: "Oswald_700Bold",
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

// Sheet steel and concrete: small radii. Pills only where the platform expects them.
export const radius = { sm: 4, md: 8, lg: 12, xl: 16, pill: 999 } as const;

// Equal-width digits: prices, times and countdowns don't jitter while they change
const tabular = { fontVariant: ["tabular-nums"] as ("tabular-nums")[] };

export const typography = {
  display: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 36, letterSpacing: -0.6 },
  h1: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 30, letterSpacing: -0.4 },
  h2: { fontFamily: fonts.semibold, fontSize: 19, lineHeight: 24, letterSpacing: -0.2 },
  h3: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 21 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  subline: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 }, // muted line under headlines
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 18 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 17 },
  eyebrow: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  figure: { fontFamily: fonts.bold, fontSize: 40, lineHeight: 44, letterSpacing: -0.8, ...tabular }, // big numbers
  figureSm: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 26, letterSpacing: -0.3, ...tabular },
  stencil: { fontFamily: fonts.stencil, letterSpacing: 1 }, // size with fontSize where used
  tabular,
} as const;

---
name: GarageGo
description: "Гаражни клетки: every garage is a painted door in the row behind the panel blocks."
colors:
  concrete: "#EDEBE4"
  whitewash: "#F8F7F3"
  raised: "#E2DFD5"
  hairline: "#CFCBC0"
  graphite: "#23272B"
  graphite-pressed: "#3B4046"
  muted-ink: "#5B6067"
  selected-tint: "#E4E1D8"
  ochre-action: "#E2A23A"
  ochre-action-pressed: "#C98D2C"
  success: "#2F7A58"
  success-soft: "#DCEDE3"
  oxide-error: "#A93A2E"
  error-soft: "#F4DFDA"
  error-text: "#9C3327"
  plate-white: "#FFFFFF"
  door-mint: "#4E8576"
  door-ochre: "#A8702A"
  door-oxide: "#9A4236"
  door-sky: "#4A729C"
  door-olive: "#6D7342"
  door-plum: "#6B587C"
typography:
  display:
    fontFamily: "Rubik_700Bold, Rubik, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: "36px"
    letterSpacing: "-0.6px"
  headline:
    fontFamily: "Rubik_700Bold, Rubik, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: "30px"
    letterSpacing: "-0.4px"
  title:
    fontFamily: "Rubik_600SemiBold, Rubik, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: "24px"
    letterSpacing: "-0.2px"
  title-sm:
    fontFamily: "Rubik_500Medium, Rubik, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: "21px"
  body:
    fontFamily: "Rubik_400Regular, Rubik, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "22px"
  subline:
    fontFamily: "Rubik_400Regular, Rubik, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "23px"
  label:
    fontFamily: "Rubik_500Medium, Rubik, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "18px"
  caption:
    fontFamily: "Rubik_400Regular, Rubik, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "17px"
  figure:
    fontFamily: "Rubik_700Bold, Rubik, sans-serif"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: "44px"
    letterSpacing: "-0.8px"
    fontFeature: "tnum"
  figure-sm:
    fontFamily: "Rubik_600SemiBold, Rubik, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: "26px"
    letterSpacing: "-0.3px"
    fontFeature: "tnum"
  stencil:
    fontFamily: "Oswald_700Bold, Oswald, sans-serif"
    fontWeight: 700
    letterSpacing: "1px"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  button-accent:
    backgroundColor: "{colors.ochre-action}"
    textColor: "{colors.graphite}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 24px"
    height: "56px"
  button-accent-pressed:
    backgroundColor: "{colors.ochre-action-pressed}"
  button-primary:
    backgroundColor: "{colors.graphite}"
    textColor: "{colors.whitewash}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 24px"
    height: "56px"
  button-primary-pressed:
    backgroundColor: "{colors.graphite-pressed}"
  button-secondary:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.md}"
    padding: "0 24px"
    height: "56px"
  button-ghost:
    textColor: "{colors.graphite}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  button-danger:
    backgroundColor: "{colors.error-soft}"
    textColor: "{colors.error-text}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.plate-white}"
    textColor: "{colors.graphite}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
    height: "54px"
  chip:
    backgroundColor: "{colors.whitewash}"
    textColor: "{colors.graphite}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "40px"
  chip-selected:
    backgroundColor: "{colors.graphite}"
    textColor: "{colors.whitewash}"
  card:
    backgroundColor: "{colors.whitewash}"
    rounded: "{rounded.lg}"
    padding: "16px"
  ticket:
    backgroundColor: "{colors.whitewash}"
    rounded: "{rounded.lg}"
    padding: "14px 16px"
  door-tile:
    typography: "{typography.stencil}"
    textColor: "{colors.plate-white}"
    rounded: "3px"
    size: "58px x 66px in lists"
  map-pin:
    backgroundColor: "{colors.graphite}"
    textColor: "{colors.whitewash}"
    rounded: "{rounded.sm}"
    padding: "4px 10px 4px 5px"
  plate:
    backgroundColor: "{colors.plate-white}"
    textColor: "{colors.graphite}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    height: "32px"
---

# Design System: GarageGo

Read this before changing any screen, component or style. AGENTS.md still applies.
Tokens live in `src/constants/theme.ts` (re-skin the whole app there). Never hardcode a hex in a screen; add a token there first. The two exceptions are named material constants (see Colors).

## Overview

**Creative North Star: "Гаражни клетки" (the garage rows)**

Behind every block of panel flats stands a row of small metal garages, each door painted a different, faded colour by whoever owns it. GarageGo is that row. The ground is light concrete with whitewashed rows and graphite ink; the only saturated colour in the app belongs to the doors themselves, and every garage keeps the same door, in the same paint, on every screen and every visit. A renter recognises a garage by its door in Find, on the garage page, on the map and in Bookings, and at the garage taps Open and watches that same door roll up.

The surface is calm and flat: hairline-ruled lists, small steel-and-concrete radii, one ochre action per screen. The one bold moment is the roller door on the active booking. Everything else stays quiet so that moment carries. The app is adaptive (Expo, phone first, web secondary), Bulgarian first with English second, and every face covers Cyrillic.

**Key Characteristics:**
- Light concrete ground, graphite ink, graphite chrome and selection.
- Six deepened door paints, one per garage for good, are the only saturated colours besides the ochre action.
- Corrugated door tiles with a stencilled size letter (М / С / Г, or S / M / L) in a condensed heavy face.
- Flat rows between hairlines; cards only for single objects.
- One roll per door state change, ease-out; crossfade under Reduce Motion; no other decorative motion.

## Colors

A light concrete-and-graphite neutral field, with saturated colour reserved for door paint and the one ochre action.

### Primary
- **Ochre Action** (`colors.cta`): the one action colour. Open on the active booking, and the single forward button per screen (Search, Book, Pay, submit). Text and icons on it are graphite (`onCta`, 7.2:1). Pressed: Ochre Action Pressed. Carries the soft `glow` lift.

### Secondary
- **Door Paints** (`doorPaints`: mint, ochre, oxide red, sky, olive, plum): each garage's door colour, picked by `doorPaint(id)`, a stable hash of the garage id. Used only on that garage's door tile, its rolling door panel, its map pin swatch and its picked pin. Deepened from faded originals so a white stencil reads on them (large text, at least 3:1). The order of the list is part of the contract: reordering repaints every garage.

### Neutral
- **Concrete** (`background`): the app ground, and the colour punched through ticket perforations.
- **Whitewash** (`surface`): rows, cards, sheets, tickets, chips at rest, the tab bar. Also the text colour on graphite (`onInk`, `onAccent`).
- **Raised** (`sand`): inputs' neighbours, quiet buttons, example-query pills, map placeholder.
- **Hairline** (`border`): row separators, input borders, outlined row actions.
- **Graphite** (`ink`, and `accent` / `accentDeep` / `primary` alias the same value): main text (13.0:1 on concrete), primary buttons, active tab pill, selected chips, step badges, focus borders, links, the door frame and lintel, map pins.
- **Muted Ink** (`textMuted`): hints and captions (5.4:1 on concrete).
- **Selected Tint** (`accentSoft`): selected tiles and info strips, one step darker than concrete.
- **Status**: `success` / `successSoft` for Paid; `error` (oxide red fill, white text 6.0:1), `errorSoft`, `errorText` for failures and destructive confirms.
- **Plate White** (`plate`, `white`): number-plate strips, input fields, stencils and the logo G.

### Material constants (literal by design)
- **EU plate blue** (`EU_PLATE_BLUE` in `src/app/(tabs)/index.tsx`): the blue band of a Bulgarian number plate on the "What I understood" strips. A material of the plate, not a theme colour; never reuse it elsewhere.
- **Bay dark** (`BAY` in `src/components/DoorPanel.tsx`): the dark garage interior behind the rolling door.

### Named Rules
**The Paint Belongs to the Door Rule.** Saturated colour appears only as a garage's door paint or as the ochre action. Chrome, selection, focus and links are graphite. If a new element wants a brand colour, it is graphite.

**The One Garage, One Door Rule.** A garage's colour always comes from `doorPaint(garage.id)`, never picked by hand, so it is the same door in every list, page, pin and booking.

**The Ochre Opens Rule.** Ochre always means "go forward" or "open the door". One ochre button per screen. On the active booking Open is ochre and Close is graphite.

## Typography

**Body Font:** Rubik (Rubik_400Regular to Rubik_700Bold), full Cyrillic
**Stencil Font:** Oswald 700 (Oswald_700Bold), only on doors
**Loaded in:** `src/app/_layout.tsx`; change families there and in `theme.ts` together.

**Character:** Rubik's soft, slightly rounded geometry carries every word in both languages; Oswald's condensed heavy caps are the paint stencilled on the doors and nothing else.

### Hierarchy
- **Display** (700, 32/36, -0.6): the screen headline (`Headline`).
- **Headline** (700, 26/30, -0.4): the garage page title.
- **Title** (600, 19/24, -0.2): section titles, the active booking's garage name.
- **Title Small** (500, 16/21): row titles, door captions, the wordmark (in 700).
- **Body** (400, 15/22) and **Subline** (400, 16/23, muted under headlines).
- **Label** (500, 14/18): buttons (at 16), chips, plates, field labels.
- **Caption** (400, 13/17): where, spec and meta lines in rows.
- **Figure** (700, 40/44, tabular) and **Figure Small** (600, 22/26, tabular): prices, ticket times (Figure at 32/36), time left.
- **Stencil** (Oswald 700, letter-spacing 1, size set where used: about 0.42 of a door tile's height, 64 on the door panel).

### Named Rules
**The Stencil Is Paint Rule.** The stencil face appears only as a single letter painted on a door (size letter, or the logo's G). Never for headings, labels or numbers.

**The Still Numbers Rule.** Prices, times, durations and countdowns use Figure, Figure Small or `typography.tabular` so digits don't jitter.

Sentence case everywhere; no all-caps text; no single word of a headline styled differently.

## Layout

Phone first. Content scrolls inside `ScreenWrapper`, which pads the bottom so nothing hides behind the floating tab bar. At 1024px and wider (`WIDE_MIN_WIDTH`, `useIsWide`) the tab bar becomes a left sidebar and content caps at 1160px centred; Find splits into a sticky 420px ask column and a results column; Bookings caps at 760px.

Spacing steps are 4 / 8 / 16 / 24 / 32 / 48. Lists are flat rows between hairlines (12px vertical padding, 12px gap); tickets pad 14. Section titles sit 32 above and 16 below. Touch targets are at least 44pt; primary buttons are 56 tall, the door's Open/Close button 72.

## Elevation & Depth

Flat by default. Hierarchy comes from the surface steps (concrete, whitewash, raised), hairlines and spacing; `shadow.card` is empty on purpose. Only floating things get depth.

### Shadow Vocabulary
- **Float** (`box-shadow: 0px 10px 28px rgba(35, 39, 43, 0.16)`): the floating tab bar, toasts, sheets, the urgent banner.
- **Glow** (`box-shadow: 0px 6px 16px rgba(168, 112, 42, 0.28)`): the enabled ochre button only.

### Named Rules
**The Only Floating Things Rule.** A shadow means "this floats over the page". Rows, cards and tickets never get one.

## Shapes

Sheet steel and concrete: small radii. Buttons and inputs 8; cards, tickets, maps and the manual-access strip 12; the ask card and active booking 16. Door tiles 3, plates and map pins 4. Pills (999) only where the platform expects them: chips, example queries, tags, the tab bar and its active-tab pill.

Doors carry their own geometry: a darker lintel band across the top (black at 22%), 1px horizontal ribs every 6px (black at 16%), the stencil at the bottom. Tickets carry a perforated tear line: 4px holes and 18px edge notches punched in the concrete ground colour.

## Components

### Buttons
Calm, solid, steel-plate rectangles (8 radius, 56 tall, 24 side padding; small: 44 tall, 16 padding). Label 16, optional 18 Ionicon.
- **Accent (ochre):** the one forward action; graphite text; Glow lift. Disabled shows as the quiet raised button at 0.7 opacity rather than a muddy ochre.
- **Primary (graphite):** whitewash text; pressed steps to Graphite Pressed. Used for Close.
- **Secondary (raised), Ghost (transparent), Danger (error-soft fill, error text):** quiet actions, cancels and destructive confirms.
- **Press:** `scale(0.96)` on buttons, chips and row actions; tappable rows and cards dim (0.75 / 0.85 opacity) instead. Disabled: 0.45 opacity.

### Chips
- **Style:** pill, 40 tall, whitewash with a hairline border, graphite label.
- **Selected:** graphite fill and border, whitewash label. Used for the list/map toggle and single-select rows.

### Cards / Containers
- **Corner Style:** 12 (16 for the ask card and active booking).
- **Background:** whitewash on concrete. No shadow, no border.
- **Use:** only for one object (the ask panel, the active booking, a ticket, a sheet). Lists of garages are never a card per item.

### Inputs / Fields
- **Style:** white field, 1.5px hairline border, 8 radius, 54 tall, Body text, muted placeholder.
- **Focus:** border turns graphite. **Error:** border oxide red, caption in error text below; otherwise a muted hint.

### Navigation
- **Phone:** a floating whitewash pill tab bar (80 tall, 40 radius, hairline border, Float shadow), 16 in from the sides. The active tab is a 56x32 graphite pill with a filled whitewash icon; inactive tabs are outline icons in muted ink. Labels Rubik 600, 12/16.
- **Wide:** a left sidebar replaces the tab bar.

### Door Tile (signature)
`src/components/DoorTile.tsx`. The garage's painted door: its `doorPaint`, lintel, ribs and the size letter stencilled in white. 58x66 in garage rows, 76x88 on the garage page header, 38x44 on booking tickets. Decorative and hidden from screen readers: the title and size are always spelled out beside it.

### Garage Row
`src/components/GarageRow.tsx`. Compact, so two or more doors fit in a phone's first screen: the 58x66 door tile, then a one-line title (Title Small), one muted Caption meta line (area and distance, size, covered or open air), and a badges line with the rating and, for garages that open from the phone, a 14px phone-portrait icon in graphite (`accentDeep`). The price column is right-aligned: hourly price in Figure Small, "per hour" and the day price in Caption. A directions row action sits beside the tappable info area, never inside it. The icon is hidden from screen readers; "opens from phone" is spelled out in the row's accessibility label.

### Find Ask Card
The ask panel (whitewash, 16 radius, 16 padding): the query input, then the example queries as raised pills (36 tall, Caption in graphite) that search on tap. On phone they sit in one horizontal scrolling row bleeding to the screen edge, and the ochre Search button appears only once there is text or a search is running; on wide they wrap and the button is always shown.

### Door Panel (signature)
`src/components/DoorPanel.tsx`. The active booking's roller door in the garage's own paint, seven slats with a light top edge, the size stencil and a handle, in a graphite frame over the dark bay.

| State | Door | Button |
|---|---|---|
| closed | down | ochre **Open** |
| opening | lifts 6px and holds, slats shimmer | loading |
| open | rolls up (700 ms, ease-out cubic), a 14px painted rail stays under the lintel; the ochre bay floor line lights | graphite **Close** |
| closing | holds 6px below open, shimmer | loading |
| error | drops back to where it was, short shake | **Try again** |

Reduce Motion: a crossfade between states, no movement or shimmer. The caption is a polite live region; the error caption is an alert in error text. Phones get a success or error haptic. Door state is derived from the door command status in `bookings.tsx`; no door logic lives in the panel.

### Logo
`LogoTile` in `src/components/Bits.tsx`: one door in the ochre door paint with lintel, ribs and a stencilled G, beside the GarageGo wordmark (`BrandMark`).

### Map Pins
Native (`AppMap.tsx`) and web (`AppMap.web.tsx`): a graphite price pill (4 radius, 2px white border) led by a 12x14 swatch of the garage's door paint; selected pins are ringed in that paint and raised above the others. A single picked pin (the garage page, the location picker) is drawn in the garage's door paint.

### Booking Ticket
Upcoming and past bookings: In and Out as large tabular times with day captions, a perforated tear line, then the garage's small door tile, title, status tag, payment and amount (struck through when cancelled). Past bookings dim to 0.7.

### Number Plate Strip
The "What I understood" filters on Find: a white strip, 32 tall, 4 radius, with a 10px EU-plate-blue band on the left and the filter in Label with tabular digits.

## Do's and Don'ts

### Do:
- **Do** take every garage's colour from `doorPaint(garage.id)` and show it wherever that garage appears.
- **Do** keep chrome, selection, focus and links graphite (`accent` equals `ink`).
- **Do** use exactly one ochre button per screen; Open is ochre, Close is graphite.
- **Do** keep text contrast at 4.5:1 or more (3:1 only for large text, icons and door stencils) and touch targets at 44pt or more.
- **Do** keep lists as flat rows between hairlines, and use the same verb through a flow: Open, Opening…, Opened 02:37.
- **Do** check every face covers Bulgarian Cyrillic before adding it, and write Bulgarian first.
- **Do** check the phone layout (390x844) and the wide layout (1024 and up): nothing hidden behind the floating tab bar, tab labels visible.
- **Do** run `npx tsc --noEmit` and `npx expo lint` before calling a change done.
- **Do** test the door states with the fake device: `node server/fake-device.js`, and the error mode (PowerShell `$env:FAIL=1; node server/fake-device.js`, cmd `set FAIL=1&& node server/fake-device.js`).

### Don't:
- **Don't** hardcode a hex in a screen; the only literals are the named material constants (EU plate blue, bay dark).
- **Don't** introduce a brand colour for chrome, or a second saturated accent outside the door paints.
- **Don't** reorder `doorPaints`: every garage would change door.
- **Don't** use the stencil face for anything but a letter on a door.
- **Don't** put shadows on rows, cards or tickets, or add gradients or decorative motion; the door roll is the only motion moment.
- **Don't** add eyebrow labels above headings that repeat them.

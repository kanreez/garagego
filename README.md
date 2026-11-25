# GarageGo

Rent out a private garage by the hour or the day, and open it from your phone. Renters search in
plain language ("garage near Pirogov tomorrow 9 to 13, fits a Golf"), book and pay, then tap Open
in the app during the booking; an ESP32 at the door opens it. Hosts list garages and pair a door.

Expo (Router) app + Node/Express backend + Supabase. See PRODUCT.md for the product and DESIGN.md
for the visual system.

## Setup

1. Install dependencies

   ```bash
   npm install
   ```

2. App env: copy `.env.example` to `.env` in the project root and fill in the Supabase URL and publishable key.

3. Backend env: copy `server/.env.example` to `server/.env` and fill in the Supabase URL, the secret key and an AI key. Get the secret key privately, never through git.

4. Database: run the SQL in `supabase/` in the Supabase SQL editor, `garages.sql` first.

## Run

One command starts the backend, the app (web) and two public tunnels, and prints the addresses
for your phone and for the ESP32:

```bash
garagego start      # garagego local: no tunnels, phone on the same Wi-Fi; garagego stop: close all
```

`garagego` is `scripts/garagego.ps1`. By hand it is two terminals in the project root:

```bash
npm run server          # backend on port 3000
npx expo start -c       # app (press w for web, or scan the QR code with Expo Go)
```

- The app finds the backend on your PC automatically in development, also from a real phone on the same Wi-Fi. If Windows asks whether Node may use the network, allow it on private networks.
- After editing `.env`, always restart with `npx expo start -c`.
- Install packages with `npx expo install <package>`, not `npm install <package>`, so versions match the Expo SDK.
- No door hardware at hand: `node server/fake-device.js <device key>` answers door commands like the ESP32.

## Screens

| Screen | File | What it does |
| --- | --- | --- |
| Log in / Register | `src/app/(auth)/` | Email or username + password |
| Find | `src/app/(tabs)/index.tsx` | Plain-language AI search, garage list and map |
| Garage | `src/app/garage/[id].tsx` | Details, reviews, time picker, book and pay |
| Bookings | `src/app/(tabs)/bookings.tsx` | The active booking's door (Open / Close), upcoming and past tickets |
| Profile / Settings | `src/app/(tabs)/profile.tsx`, `src/app/settings.tsx` | Name, username, language |
| Host | `src/app/host/` | List and edit garages, pair a door device, earnings |

Project layout:

```
src/app/          screens (Expo Router): Find, Bookings, Profile, garage/[id], host/, settings
src/components/   Button, Input, Card, Chip, Header, GarageRow, DoorTile, DoorPanel (the door
                  on an active booking), PaySheet, ReviewBox, StateViews, Toast (notify), map/
src/constants/    theme.ts (design tokens, door paints; see DESIGN.md), garages.ts, app.ts
src/services/     api.ts (backend calls with the user's token), garages.ts, payments.ts,
                  account.ts, userService.ts (profiles), geo.ts, supabase.ts
src/i18n/         bg.ts (default) and en.ts strings, errors.ts
server/           server.js (garages, search, bookings, payments, door commands),
                  repo.js (Supabase with in-memory fallback), payments/ (mock checkout),
                  fake-device.js (stand-in ESP32)
firmware/         garage_bridge/: the ESP32 sketch and its Wokwi wiring (diagram.json)
supabase/         SQL for the tables (garages.sql first, then the others)
scripts/          garagego.ps1: `garagego start | local | stop | urls`
```

Useful snippets:

```ts
notify("Saved");                         // toast on web and phone (Alert.alert does nothing on web)
notify(e.message, "error");

const { data, loading, error, reload } = useAsync(() => myBookings(), []);
```

## Supabase checklist

- `profiles` table exists (used by `userService.ts`, the Profile screen and `/api/me`).
- For the demo: turn off "Confirm email" (Authentication → Sign In / Providers → Email) and create a demo account.

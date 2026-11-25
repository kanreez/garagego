# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

One Expo (React Native) codebase ships the same custom interface to iOS and Android phones, which are
the main way people use it. The web build of the same code is secondary (demos, a PC browser); it has
its own wide layout with a sidebar.

## Users

- **Renters:** drivers in Bulgarian cities who need a parking place for a few hours or days, often
  near a specific landmark (a hospital, an office, a busy street), and usually on their phone while
  on the move or about to leave.
- **Hosts:** people whose private garage stands empty while they don't need it, who want to earn from
  it without meeting renters or handing over keys.

## Product Purpose

GarageGo lets hosts rent out private garages by the hour or the day and lets renters open the real
garage door from their phone during a paid booking. Success: a renter goes from "I need a garage near
Pirogov tomorrow 9 to 13" to standing at an open door without a call, a message or a key.

## Positioning

- A small ESP32 retrofit, wired to the opener's existing wall-button terminals, makes any existing
  garage door open from the app. Hosts need no new door or opener.
- The door only opens during a paid booking that covers the current moment; the server checks this
  before any command reaches the door. The phone never talks to the door directly.
- Renters search in plain language; AI turns the request into filters (area, time, vehicle size,
  covered or open).
- Neighbouring service: CAR BNP (app-opened parking with its own hardware installation).

## Operating Context

- Flow: Find (plain-language search, map and list) → Book (hours or days, price, pay) → Open/Close
  the door from My bookings while the booking is active.
- Hosts: list a garage (city, area, address, map pin, size, covered or open, hourly and daily price,
  weekly free hours, photo, access "app" or "manual"), pair a door device by its key, see earnings.
- The door moment happens physically, standing in front of a garage, often outdoors and at any time
  of day.
- Built for the "Hack The Building" hackathon (sponsor MClimate, Sofia); the live demo shows a phone
  tap and the door device reacting side by side.

## Capabilities and Constraints

- Payments are a mock checkout (test cards); no real money moves.
- Garages with access "manual" are let in by the host and have no Open button.
- Door commands expire after 20 seconds; the app shows the device's real confirmation time.
- Garages can be in any Bulgarian city; the seed data is in Sofia, Plovdiv, Varna and Pazardzhik.
- Stack is fixed by the codebase: Expo SDK 58 + Expo Router, Express backend, Supabase.

## Brand Commitments

- Name: GarageGo.
- Language: Bulgarian is the default UI language, English the second one. Every screen must work in
  both, including Cyrillic in every typeface used.

## Evidence on Hand

- Real reviews exist only as sample and test data; there are no real customers, usage numbers,
  testimonials or press. Nothing of the kind may be invented.

## Product Principles

1. The door moment is the product: opening the garage must feel certain, fast and trustworthy.
2. Show the real state, never a hopeful one: paid or not, active or not, opened or not, from the server.
3. Plain words from the renter's side; no jargon about devices, commands or keys.
4. Hosts and renters are both users; the host side gets the same care as the renter side.

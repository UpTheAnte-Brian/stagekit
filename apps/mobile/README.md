# StageKit Mobile

This folder contains the Expo / React Native app for StageKit.

## What This Is

- A native iPhone client that will talk to the same Supabase backend as the web app
- The place to rebuild the current web workflows for touch, camera, and on-site usage

## First Run

1. Copy `.env.example` to `.env`.
2. Copy the same Supabase project values used by the web app into `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
3. From the repo root, run `pnpm dev:mobile`.
4. Open the QR code with Expo Go on an iPhone.

## Put It On a Phone

### Fastest testing route: Expo Go

1. Install **Expo Go** from the App Store or Google Play on each phone.
2. Confirm the phone and development computer are on the same Wi-Fi network.
3. From the repo root, run `pnpm dev:mobile`.
4. Scan the QR code in Expo Go (Android) or in the iPhone Camera app (iOS), then choose **Open in Expo Go**.
5. Sign in using a StageKit account and check an existing inventory item's photo, then add a test photo from the phone.

### Installable preview app: EAS Build

Use this when the app should open normally from the home screen without the development computer running.

1. Sign in to the Expo account that owns the StageKit project:
   `pnpm dlx eas-cli@latest login`
2. For a new iPhone, register the device when EAS prompts, or run:
   `pnpm dlx eas-cli@latest device:create`
3. Create a shareable test build:
   `pnpm dlx eas-cli@latest build --platform ios --profile preview`
4. Open the build link on the phone and install it. For Android, use:
   `pnpm dlx eas-cli@latest build --platform android --profile preview`

The `preview` profile is configured for internal distribution. An iPhone must be registered to install an iOS preview build; Android preview builds install directly from the generated link.

## Initial Build Order

1. Authentication
2. Inventory list
3. Inventory item detail and edit
4. Jobs list and job detail
5. Photo picking / camera upload

## Current Status

The mobile app now includes:

- Expo Router
- Bottom tab navigation
- Supabase auth with device session persistence
- Inventory screen with search and filters
- Add item screen with camera capture and photo upload
- Projects, warehouse, and account tabs

## Important Constraint

The current web app uses Next.js server-side helpers such as `src/lib/supabase/server.ts` and `src/lib/db/inventory.ts`.
That code is not reusable in React Native as-is because it depends on Next server runtime and cookies.
The shared pieces to extract later are:

- Zod schemas
- Type unions like inventory statuses and conditions
- Small pure utility functions

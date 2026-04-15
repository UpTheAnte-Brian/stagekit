# StageKit Mobile

This folder contains the Expo / React Native app for StageKit.

## What This Is

- A native iPhone client that will talk to the same Supabase backend as the web app
- The place to rebuild the current web workflows for touch, camera, and on-site usage

## First Run

1. Copy `.env.example` to `.env`.
2. Fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
3. From the repo root, run `pnpm dev:mobile`.
4. Open the QR code with Expo Go on an iPhone.

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

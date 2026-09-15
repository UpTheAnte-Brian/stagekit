# StageKit

StageKit is a Next.js App Router app for local staging inventory workflows, backed by Supabase local development.

## Tech Stack

- Next.js (App Router, TypeScript, Tailwind CSS)
- Supabase local CLI stack (Postgres, Auth, Storage, PostgREST)
- `@supabase/ssr` for auth-aware server/browser clients
- Zod for payload validation

## Prerequisites

- Node 20+
- `pnpm`
- Supabase CLI
- Docker Desktop running

## Local Setup

1. Install dependencies:

```bash
pnpm install
```

2. Start Supabase local:

```bash
supabase start
```

3. Apply migrations (schema, RLS, storage bucket/policies, seed):

```bash
supabase db reset
```

4. Generate local DB types:

```bash
supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

5. Ensure `.env.local` exists with local keys (example values are in `.env.example`).

6. Start the app:

```bash
pnpm dev
```

7. Visit:

- App: `http://localhost:3000`
- Supabase Studio: `http://127.0.0.1:54423`

## Common Commands

- `pnpm dev` - run Next.js dev server
- `pnpm build` - production build
- `pnpm start` - run production server
- `pnpm lint` - lint TypeScript/Next files
- `supabase start` - start local Supabase services
- `supabase stop` - stop local Supabase services
- `supabase db reset` - recreate local DB and apply migrations
- `supabase migration new <name>` - create a new migration

## Implemented Routes

- `/login` - email/password sign in + sign up
- `/inventory` - inventory table with search/filters and quick add
- `/inventory/[id]` - item edit form, photo upload, signed URL gallery
- `/jobs` - job list and create form
- `/jobs/[id]` - assign items and check-in workflow

## Mobile App

An Expo / React Native app now lives in [`apps/mobile`](./apps/mobile).

Useful commands from the repo root:

- `pnpm dev:web` - run the Next.js web app
- `pnpm dev:mobile` - start the Expo dev server
- `pnpm ios` - open the mobile app in an iOS simulator if Xcode is installed

The mobile app will use the same Supabase backend, but it cannot directly reuse the current Next.js server-only modules.
Treat the existing web app as the product reference while rebuilding the mobile screens natively.

### Duplicate inventory review

Open an inventory item and choose **Flag as duplicate** in **Duplicate Review**.
Manual flags remain in Inventory → Inventory Audit → Duplicate Candidates until
cleared, and can be added again after clearing. Clearing an automatic candidate
suppresses it on later scans.

The media audit compares identical files across all item photos, including
secondary photos, regardless of item names or other metadata. Shared photos are
candidates for manual review, not proof that two records should be merged.
Item detail pages show matching photos and links to the other records.

After applying database migrations, scan and preview with
`pnpm inventory:refresh-audit-tags --dry-run`. To populate only duplicate flags
and photo fingerprints from the generated queue, run
`pnpm inventory:apply-audit-tags --duplicates-only --apply --queue <queue-report>`.
Use a fresh complete scan. The normal full audit refresh also includes these
matches. No inventory items or photos are deleted by this process.

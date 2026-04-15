# StageKit Production Cutover Checklist

Use this when you are ready to move StageKit from local-only development to:

- a real GitHub home
- a real hosted Supabase project
- a deployed web app
- installable iPhone builds that do not require Expo Go

This checklist does **not** make the app work fully offline with no internet. The current mobile app still talks directly to Supabase for data and uploads.

## 1. Decide GitHub ownership first

Goal: put the repo under the identity you actually want long-term.

You currently have:

- Git remote: `https://github.com/bwjohnson16/stagekit.git`
- Local git name: `bwjohnson16`
- Local git email: `bwjohnson1@gmail.com`

### Recommended choice

If `bwjohnson16` was created for an org idea and not as your personal GitHub identity:

1. Create or log into your real personal GitHub account.
2. Decide whether the final repo should live in:
   - your personal account, or
   - a dedicated GitHub organization later
3. Transfer the existing `stagekit` repo to that final owner, or create a new repo there and push to it.

### Local git identity cleanup

Check current values:

```bash
git config user.name
git config user.email
```

Set them for this repo only:

```bash
git config user.name "Your Real Name"
git config user.email "you@your-real-email.com"
```

If you want the change globally for future repos:

```bash
git config --global user.name "Your Real Name"
git config --global user.email "you@your-real-email.com"
```

### If you create a new GitHub repo and want to repoint origin

Check current remote:

```bash
git remote -v
```

Set the new one:

```bash
git remote set-url origin https://github.com/YOUR-ACCOUNT/stagekit.git
```

Verify:

```bash
git remote -v
```

## 2. Get the repo into a clean deployable state

Before pushing anywhere:

1. Review `git status`.
2. Make sure `.env` files are not committed accidentally.
3. Commit the current working tree once it is in a state you trust.

Useful commands:

```bash
git status
git diff --stat
git add .
git commit -m "Prepare production cutover"
git push origin main
```

Do not push secrets. Only commit `.env.example` files.

## 3. Create the Supabase production project

In Supabase:

1. Create a new project.
2. Use a stable name like `stagekit-prod`.
3. Pick the nearest region for your real use.
4. Save the database password in your password manager.

After project creation, collect:

- Project ref - gaevumyjhlnprzjoausy
- Project URL - https://gaevumyjhlnprzjoausy.supabase.co
- Anon/publishable key - store in `.env.local` and `apps/mobile/.env`, not in docs
- Service role or secret server key - store in `.env.local` only, not in docs
- Database password

You will need these in later steps.

## 4. Link this repo to the remote Supabase project

Log into Supabase CLI if needed:

```bash
supabase login
```

Link this local repo to the remote project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

If prompted, provide the remote database password.

## 5. Push the database schema to the remote project

Dry run first:

```bash
supabase db push --dry-run
```

If the output looks correct, push:

```bash
supabase db push
```

If you want seed data in production, be deliberate. Do not push demo data accidentally.

The repo currently includes:

- migrations in `supabase/migrations`
- seed config in `supabase/config.toml`
- seed SQL in `supabase/seed.sql`

Read those before deciding whether production should receive seed data.

## 6. Regenerate types against the remote project if needed

If you want fresh production-aligned types later:

```bash
supabase gen types typescript --linked > src/lib/supabase/database.types.ts
```

Then review and commit the type update if it changed.

## 7. Set production environment variables for the web app

The Next app expects:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

These are documented in:

- `.env.example`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`

If deploying to Vercel, add those three env vars in the project settings before the first production deploy.

## 8. Deploy the web app

Choose a host. Vercel is the easiest fit for this Next.js app.

High-level flow:

1. Import the GitHub repo into Vercel.
2. Set the root project to this repo.
3. Add the production env vars.
4. Deploy.
5. Open the deployed site and test:
   - login
   - inventory list
   - inventory detail
   - jobs flows
   - photo upload

Also add the final web URL to Supabase auth settings:

- Site URL
- Redirect URLs

Your local config currently uses localhost values, so production auth redirects must be updated in the Supabase dashboard.

## 9. Point the mobile app at production Supabase

The mobile app expects:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

See:

- `apps/mobile/.env.example`
- `apps/mobile/src/lib/supabase.ts`

For local testing against production, set those in:

`apps/mobile/.env`

## 10. Package the mobile app so it does not require Expo Go

This is a separate step from deploying the DB and web app.

Current state:

- mobile app exists in `apps/mobile`
- iOS bundle ID is already set to `com.stagekit.mobile`
- there is no `eas.json` yet

To distribute real installable iPhone builds:

1. Install and log into EAS CLI.
2. Initialize EAS config in `apps/mobile`.
3. Configure iOS build credentials.
4. Create a development build or TestFlight build.

Typical flow:

```bash
pnpm add -D eas-cli --filter @stagekit/mobile
cd apps/mobile
npx eas login
npx eas build:configure
```

This should create `apps/mobile/eas.json`.

Then build for iOS:

```bash
npx eas build --platform ios
```

For sharing with you and your wife, TestFlight is the right path.

## 11. TestFlight plan for you and your wife

If the goal is "install on both phones without Expo Go":

1. Build the iOS app with EAS.
2. Submit the build to App Store Connect.
3. Add both Apple IDs as TestFlight testers.
4. Install through TestFlight.

That solves:

- no Expo Go
- no dependence on your laptop
- no same-network requirement

That does **not** solve:

- full no-internet usage

## 12. What would be required for true offline use

If the goal is "works with no internet at all," the app still needs:

1. A local on-device database or cache for inventory, jobs, and related records.
2. A sync engine to queue writes while offline.
3. Conflict handling rules when multiple devices edit the same records.
4. A photo upload queue that retries when connectivity returns.

Right now the mobile app persists auth, but not the business data model for offline-first use.

## 13. Suggested order for tonight

If time is limited, do this exact sequence:

1. Clean up your GitHub identity decision.
2. Repoint or transfer the GitHub repo.
3. Commit and push the current repo state.
4. Create the production Supabase project.
5. Link with `supabase link`.
6. Run `supabase db push --dry-run`.
7. Run `supabase db push`.
8. Add production env vars to your web host.
9. Deploy the Next.js app.
10. Verify login and core workflows in production.
11. Only after that, set up EAS/TestFlight for the mobile app.

## 14. Minimum success definition

You are in good shape when all of this is true:

- GitHub repo lives under the correct long-term owner.
- Supabase production project exists and migrations are applied.
- Web app is deployed and can log in against production Supabase.
- Mobile app can connect to production Supabase.
- A TestFlight build installs on both phones.

## 15. Things to avoid during cutover

- Do not commit `.env.local` or `apps/mobile/.env`.
- Do not push demo seed data into production unless you mean to.
- Do not assume web deploy automatically creates mobile builds.
- Do not assume a remote Supabase project gives you offline support.

# Contributing to Marco Polo

Thanks for helping build an open travel app! This guide covers everything you
need to get productive.

## Development setup

Follow the [Getting started](README.md#getting-started) section of the README.
The short version:

```bash
pnpm install
pnpm tauri dev   # desktop app with hot reload
pnpm dev         # UI only, in a browser, with sample data
```

You do **not** need any API keys to develop — demo mode generates realistic
sample data for every provider.

## Project layout

```
src/                    Next.js frontend (static export)
  app/                  Routes: flights, hotels, experiences, itinerary, …
  components/           React components (components/ui = shadcn/ui)
  lib/types/            Domain types shared across features
  lib/tauri.ts          Typed bridge to Rust commands (+ browser fallback)
src-tauri/              Rust backend
  src/amadeus.rs        Amadeus client (flights) + IPC types
  src/demo.rs           Demo-mode sample data
  src/error.rs          Error type serialized to the frontend
supabase/migrations/    Database schema (Postgres + RLS)
.github/workflows/      CI (lint, typecheck, cargo) and release builds
```

## Conventions

- **Types are mirrored.** Frontend domain types live in `src/lib/types/`;
  their Rust counterparts serialize to the same camelCase shapes. If you change
  one side, change the other.
- **Secrets stay in Rust.** Provider API keys are read from the environment in
  the Rust process. Never expose them to the webview or prefix them with
  `NEXT_PUBLIC_`.
- **Every provider gets a demo mode.** If a feature calls an external API, it
  must also work without keys (see `src-tauri/src/demo.rs`), so contributors
  and first-run users always see a working app.
- **Database changes are migrations.** Add a new numbered file under
  `supabase/migrations/` — never edit an applied migration. Enable RLS on
  every new table.
- TypeScript strict mode, ESLint (`pnpm lint`), and `cargo clippy` should all
  pass before you open a PR.

## Pull requests

1. Fork and branch from `main` (`feat/hotel-search`, `fix/price-format`, …).
2. Keep PRs focused — one feature or fix per PR.
3. Make sure `pnpm build` and `cargo check` (in `src-tauri/`) pass; CI runs
   both on macOS and Windows.
4. Describe *what* and *why* in the PR body; screenshots for UI changes help a
   lot.

## Picking up work

Issues are labeled by feature area (`flights`, `hotels`, `itinerary`, …) and
difficulty (`good first issue`, `help wanted`). Comment on an issue before
starting so we can avoid duplicate work.

## Code of conduct

Be kind and assume good intent. Harassment or disrespect of any kind isn't
tolerated.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Marco Polo project notes

Open-source travel aggregator desktop app (Tauri v2 + Next.js static export).

- `pnpm tauri dev` runs the desktop app; `pnpm dev` runs UI-only in a browser
  with sample data. `pnpm build` must stay a valid static export (no SSR/API
  routes — the app ships as static files inside Tauri).
- Rust backend lives in `src-tauri/src`; provider API clients and secrets stay
  there, never in the webview. Frontend calls them via `src/lib/tauri.ts`.
- Domain types are mirrored: `src/lib/types/*` (TS) ⟷ Rust structs serializing
  camelCase. Change both sides together.
- Every provider integration needs a demo mode (`src-tauri/src/demo.rs`) so the
  app works without API keys.
- Database changes = new migration in `supabase/migrations/`, RLS on every table.
- Before PR: `pnpm lint`, `pnpm build`, and in `src-tauri/`: `cargo fmt --check`
  and `cargo clippy -- -D warnings` (all enforced by CI).

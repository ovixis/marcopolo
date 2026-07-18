<p align="center">
  <img src="assets/logo-1024.png" alt="Marco Polo logo" width="140"/>
</p>

# Marco Polo 🧭

**An open-source travel aggregator for your desktop.** Search flights, hotels,
and experiences; plan day-by-day itineraries; track your budget; and let AI turn
your photos into trip stories — all in one native app for macOS and Windows.

Built with [Tauri v2](https://tauri.app) (Rust) + [Next.js](https://nextjs.org)
(React, TypeScript, Tailwind, shadcn/ui) + [Supabase](https://supabase.com).
MIT licensed.

## Features

| Feature | Status | Provider |
| --- | --- | --- |
| 🧭 Ask Marco (AI chat) | ✅ MVP | your model: Claude, OpenAI, Grok, Kimi, custom |
| ✈️ Flight search | ✅ MVP | Duffel |
| 🏨 Hotel search | ✅ MVP | LiteAPI (Nuitee) |
| 🎟️ Experiences | 🚧 Roadmap (weeks 5-8) | Viator |
| 📅 Itinerary builder | 🚧 Roadmap (weeks 9-10) | — |
| 💰 Budget tracker | 🚧 Roadmap (weeks 9-10) | — |
| 📷 Photo gallery | 🚧 Roadmap (weeks 11-12) | Supabase Storage |
| 📖 AI journal | 🚧 Roadmap (weeks 11-12) | Claude Vision |
| 💬 Travel agent messaging | 🚧 Roadmap (weeks 13-14) | Supabase Realtime |

**No API keys? No problem.** Marco Polo ships with a demo mode that generates
realistic sample data locally, so you can explore (and develop) every feature
without signing up for anything.

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) ≥ 20 and [pnpm](https://pnpm.io) ≥ 10
- [Rust](https://rustup.rs) (stable)
- Platform build tools:
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Windows**: [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) + [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) (preinstalled on Windows 11)

### Run in development

```bash
git clone https://github.com/ovixis/marcopolo.git
cd marcopolo
pnpm install
pnpm tauri dev
```

That starts the Next.js dev server and opens the desktop window with hot reload
on both the frontend and the Rust backend.

### Build installers

```bash
pnpm tauri build
```

Produces a `.dmg`/`.app` on macOS and `.msi`/`.exe` installers on Windows,
under `src-tauri/target/release/bundle/`.

## Configuration

Copy `.env.example` to `.env` and fill in the services you want. Everything is
optional — missing keys simply keep that feature in demo mode.

| Variable | Purpose |
| --- | --- |
| `DUFFEL_API_KEY` | Real flight search. Free test-mode keys at [app.duffel.com](https://app.duffel.com) — test keys (`duffel_test_…`) return sandbox offers, live keys real content |
| `LITEAPI_API_KEY` | Real hotel search. Keys at [liteapi.travel](https://liteapi.travel) — searches are free; only confirmed bookings are billed |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth, trips database, photo storage |
| `ANTHROPIC_API_KEY` | AI journal synthesis (roadmap) |

## Ask Marco (built-in AI chat)

The **Ask Marco** page is a ChatGPT-style travel aggregator: pick your model
(Claude, OpenAI, Grok, Kimi, or any OpenAI-compatible endpoint — including a
local Ollama), paste your own API key, and ask for a trip. The agent loop runs
in the Rust backend, calls the app's live travel tools (flights via Duffel,
hotels via LiteAPI, experiences, airport lookup), and answers with a
day-by-day plan plus a budget table. Your key stays on your device and is
sent only to the model provider you chose.

## Connect your AI (MCP)

While the app is open it runs a local **MCP server** on
`http://127.0.0.1:1254/mcp` (port = Marco Polo's birth year; override with
`MARCOPOLO_MCP_PORT`). Any MCP-capable AI client — Claude, ChatGPT/OpenAI
agents, Grok, Kimi, Cursor — can use the app's travel search as tools:
`search_flights`, `search_hotels`, and `search_locations`.

The in-app **AI Connect** page has copy-paste setup snippets per client. The
quick version for Claude Code:

```bash
claude mcp add --transport http marco-polo http://127.0.0.1:1254/mcp
```

The server binds to localhost only. Cloud-hosted AIs need a tunnel (ngrok,
cloudflared) to reach it — the AI Connect page explains the trade-offs.

### Supabase setup (optional)

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. Apply the schema: `supabase link --project-ref <your-ref> && supabase db push`
   (or paste `supabase/migrations/00001_initial_schema.sql` into the SQL editor).
3. Put the project URL and anon key in `.env`.

The schema ships with row-level security enabled on every table — users can
only ever see their own trips, photos, and messages.

## Architecture

```
┌────────────────────────────────────────────────┐
│ Tauri shell (Rust)                             │
│  • Provider API clients (Duffel, LiteAPI, …)   │
│  • API keys stay in the native process         │
│  • Demo-mode data generation                   │
│    ▲ typed IPC commands                        │
│    ▼                                           │
│ Next.js static export (React + TypeScript)     │
│  • shadcn/ui + Tailwind                        │
│  • Supabase JS client (auth/db/storage)        │
└────────────────────────────────────────────────┘
```

- Provider credentials live only in the Rust process — they are never shipped
  to the webview.
- The frontend is a fully static Next.js export; the same UI runs in a plain
  browser (`pnpm dev`) with sample data for fast UI iteration.
- Domain types are mirrored between `src/lib/types/` (TypeScript) and
  `src-tauri/src/types.rs` (Rust) — keep them in sync when contributing.

## Contributing

We'd love your help — see [CONTRIBUTING.md](CONTRIBUTING.md) for the dev
workflow, project layout, and how to pick up an issue. Good first areas:

- Experiences (Viator) provider client
- Itinerary drag-and-drop builder
- Budget tracker with multi-currency support

## License

[MIT](LICENSE) © Marco Polo contributors

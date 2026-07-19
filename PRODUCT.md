# Marco Polo Product Context

## What it is
Marco Polo is an open-source travel aggregator desktop app (Tauri v2 + Next.js static export). It lets users plan trips with their own AI — no new subscriptions, no API keys required for local/CLI connectors.

## Users
- Travelers who already pay for an AI subscription (Claude, ChatGPT, Kimi, etc.)
- Privacy-conscious users who want their data to stay on-device
- Developers who want a self-hosted, hackable travel planner

## Register
Product UI. The chat is the command center; the right panel is the trip document. Design serves the task: fast scanning, clear hierarchy, calm confidence.

## Brand voice
Calm, precise, no hype. A seasoned traveler's notebook, not a sales page.

## Anti-references
- Purple gradients
- Glassmorphism
- "Boost your productivity"
- Generic SaaS dashboards
- AI-generated stock imagery
- Overly rounded cards and buttons
- Gradient text on headings or metrics
- Side-stripe borders on cards

## Key flows
1. **Connect AI**: One click. Detect installed CLIs (Claude Code, Kimi Code), local runtimes (Ollama), or desktop apps (Claude Desktop, Kimi). If none found, show a terminal command to run.
2. **Plan trip**: User types a request. Chat extracts details (destination, origin, dates, travelers, interests) into the right panel. When enough details are captured, the user can generate the trip.
3. **Review trip**: Right panel shows itinerary with hero, metrics, route map, daily timeline, transport, and estimated price. Actions: Download, Book.
4. **Theme**: Toggle between dark (default) and light (warm paper) modes.

## Non-goals
- Selling AI access or subscriptions
- Being a generic chatbot wrapper
- Looking like a landing page

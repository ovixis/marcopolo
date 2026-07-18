"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Hotel, Plane, Ticket } from "lucide-react";

import { backendStatus, type BackendStatus } from "@/lib/tauri";

/**
 * The features that used to be their own menu tabs — flights, hotels,
 * experiences — now run as background actions inside Ask Marco. This rail
 * surfaces them as capabilities (with live/demo status) and routes a tap
 * straight into a relevant Marco prompt.
 */
const CAPABILITIES = [
  {
    icon: Plane,
    label: "Flights",
    provider: "Duffel",
    prompt: "Find me a nonstop flight from New York to Tokyo on August 17.",
    live: (s: BackendStatus) => s.flightsConfigured,
    env: (s: BackendStatus) => s.environment,
  },
  {
    icon: Hotel,
    label: "Hotels",
    provider: "LiteAPI",
    prompt: "Find a well-reviewed 4-star hotel in central Kyoto for 5 nights.",
    live: (s: BackendStatus) => s.hotelsConfigured,
    env: (s: BackendStatus) => s.hotelsEnvironment,
  },
  {
    icon: Ticket,
    label: "Experiences",
    provider: "curated",
    prompt: "Suggest a few food and culture experiences in Osaka.",
    live: () => false,
    env: () => "demo",
  },
] as const;

export function CapabilityRail() {
  const router = useRouter();
  const [status, setStatus] = useState<BackendStatus | null>(null);

  useEffect(() => {
    backendStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  function ask(prompt: string) {
    try {
      sessionStorage.setItem("marco.prefill", prompt);
    } catch {
      // ignore storage failures
    }
    router.push("/chat");
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="mb-1 text-xs text-muted-foreground">
        Marco handles these in the background — just ask.
      </p>
      {CAPABILITIES.map((cap) => {
        const isLive = status ? cap.live(status) : false;
        const env = status ? cap.env(status) : "…";
        return (
          <button
            key={cap.label}
            onClick={() => ask(cap.prompt)}
            className="group flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5 text-left transition-colors hover:border-cyan-400/30 hover:bg-cyan-400/[0.04]"
          >
            <span className="rounded-lg bg-primary/10 p-2 text-primary">
              <cap.icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{cap.label}</span>
              <span className="block text-xs text-muted-foreground">
                {cap.provider}
              </span>
            </span>
            <span
              className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wide ${
                isLive ? "text-emerald-400" : "text-muted-foreground"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  isLive ? "bg-emerald-400" : "bg-slate-500"
                }`}
              />
              {isLive ? env : "demo"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

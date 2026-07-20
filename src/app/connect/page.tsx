"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Plug, Server } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { backendStatus } from "@/lib/tauri";
import { AnimatedSection } from "@/components/animation/animated-section";

const FALLBACK_ENDPOINT = "http://127.0.0.1:1254/mcp";

const TOOLS = [
  {
    name: "search_flights",
    description: "Live flight offers: airlines, times, stops, prices.",
  },
  {
    name: "search_hotels",
    description: "Hotel stays with rates, stars, review scores, cancellation.",
  },
  {
    name: "search_locations",
    description: "Resolve city or airport names into IATA codes.",
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Copy to clipboard"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard unavailable (e.g. plain http browser preview) — ignore.
        }
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </Button>
  );
}

function Snippet({ label, code }: { label?: string; code: string }) {
  return (
    <div className="rounded-lg border bg-muted/50">
      <div className="flex items-center justify-between border-b px-3 py-1.5">
        <span className="text-xs text-muted-foreground">{label ?? "shell"}</span>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function ConnectPage() {
  const [endpoint, setEndpoint] = useState(FALLBACK_ENDPOINT);
  const [inTauri, setInTauri] = useState(false);

  useEffect(() => {
    backendStatus()
      .then((status) => {
        if (status.version !== "web-preview") {
          setInTauri(true);
          if ("mcpEndpoint" in status && typeof status.mcpEndpoint === "string") {
            setEndpoint(status.mcpEndpoint);
          }
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 lg:px-8 lg:py-10">
      <AnimatedSection direction="up" distance={18}>
        <div className="mb-2 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary shadow-sm">
            <Plug className="size-6" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">AI Connect</h1>
            <p className="text-sm text-muted-foreground">Wire Marco into your favorite AI client</p>
          </div>
        </div>
        <p className="mb-6 max-w-xl text-muted-foreground">
          Marco Polo runs a local <strong>MCP server</strong> in the background,
          so your favorite AI — Claude, ChatGPT, Grok, Kimi, Cursor, and any
          other MCP-capable client — can search flights and hotels through this
          app.
        </p>
      </AnimatedSection>

      <AnimatedSection direction="up" distance={18} delay={0.06}>
        <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Server className="size-4 text-primary" aria-hidden />
              Local endpoint
            </CardTitle>
            {inTauri ? (
              <Badge variant="secondary">running</Badge>
            ) : (
              <Badge variant="outline">start the desktop app</Badge>
            )}
          </div>
          <CardDescription>
            Bound to localhost only — nothing is exposed to your network. The
            server is on while the app is open.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
              {endpoint}
            </code>
            <CopyButton text={endpoint} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Exposed tools</p>
            <ul className="flex flex-col gap-1.5">
              {TOOLS.map((tool) => (
                <li key={tool.name} className="flex items-baseline gap-2 text-sm">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {tool.name}
                  </code>
                  <span className="text-muted-foreground">
                    {tool.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <h2 className="mb-3 text-lg font-semibold">Set up your client</h2>
      <Tabs defaultValue="claude">
        <TabsList className="mb-3 flex-wrap">
          <TabsTrigger value="claude">Claude</TabsTrigger>
          <TabsTrigger value="cursor">Cursor</TabsTrigger>
          <TabsTrigger value="openai">ChatGPT / OpenAI</TabsTrigger>
          <TabsTrigger value="cloud">Grok · Kimi · cloud AIs</TabsTrigger>
        </TabsList>

        <TabsContent value="claude" className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            <strong>Claude Code</strong> — one command:
          </p>
          <Snippet code={`claude mcp add --transport http marco-polo ${endpoint}`} />
          <p className="text-sm text-muted-foreground">
            <strong>Claude Desktop</strong> — add to{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              claude_desktop_config.json
            </code>{" "}
            (Settings → Developer → Edit Config):
          </p>
          <Snippet
            label="claude_desktop_config.json"
            code={`{
  "mcpServers": {
    "marco-polo": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${endpoint}"]
    }
  }
}`}
          />
        </TabsContent>

        <TabsContent value="cursor" className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Add to <code className="rounded bg-muted px-1 py-0.5 text-xs">.cursor/mcp.json</code>{" "}
            (project) or <code className="rounded bg-muted px-1 py-0.5 text-xs">~/.cursor/mcp.json</code>{" "}
            (global):
          </p>
          <Snippet
            label="mcp.json"
            code={`{
  "mcpServers": {
    "marco-polo": {
      "url": "${endpoint}"
    }
  }
}`}
          />
        </TabsContent>

        <TabsContent value="openai" className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            With the <strong>OpenAI Agents SDK</strong>, point a hosted or
            local agent at the endpoint:
          </p>
          <Snippet
            label="python"
            code={`from agents.mcp import MCPServerStreamableHttp

marco_polo = MCPServerStreamableHttp(
    params={"url": "${endpoint}"},
    name="marco-polo",
)`}
          />
          <p className="text-sm text-muted-foreground">
            ChatGPT&apos;s cloud connectors can&apos;t reach localhost — for
            those, expose the endpoint with a tunnel first (see the cloud
            tab).
          </p>
        </TabsContent>

        <TabsContent value="cloud" className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Cloud-hosted AIs (Grok, Kimi, ChatGPT web, claude.ai) run on
            remote servers and can&apos;t see your localhost. Expose the
            endpoint through a tunnel while the app is running, then register
            the public URL as a remote MCP server in your AI&apos;s connector
            settings:
          </p>
          <Snippet code={`ngrok http 1254
# or
cloudflared tunnel --url http://127.0.0.1:1254`} />
          <p className="text-sm text-muted-foreground">
            The tunnel URL + <code className="rounded bg-muted px-1 py-0.5 text-xs">/mcp</code>{" "}
            is what you paste into the connector form. Anyone with that URL
            can run searches with your API keys, so keep tunnels short-lived.
          </p>
        </TabsContent>
      </Tabs>
      </AnimatedSection>
    </div>
  );
}

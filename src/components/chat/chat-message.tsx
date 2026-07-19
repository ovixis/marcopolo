"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatMessageData {
  role: "user" | "assistant";
  content: string;
  tools?: string[];
  error?: boolean;
  streaming?: boolean;
}

const TOOL_LABELS: Record<string, string> = {
  search_flights: "Flights",
  search_hotels: "Hotels",
  search_experiences: "Experiences",
  search_locations: "Places",
};

interface ChatMessageProps {
  message: ChatMessageData;
}

export function ChatMessage({ message }: ChatMessageProps) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end px-4 py-4 sm:px-6 lg:px-8">
        <div className="max-w-xl rounded-2xl rounded-br-md bg-secondary px-5 py-3 text-[15px] text-secondary-foreground shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "px-4 py-5 sm:px-6 lg:px-8",
        message.error ? "bg-destructive/5" : "",
      )}
    >
      <div className="mx-auto flex max-w-2xl gap-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          M
        </div>
        <div className="min-w-0 flex-1">
          {message.tools && message.tools.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {[...new Set(message.tools)].map((tool) => (
                <span
                  key={tool}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary"
                >
                  <Wrench className="size-2.5" aria-hidden />
                  {TOOL_LABELS[tool] ?? tool}
                </span>
              ))}
            </div>
          )}
          <div
            className={cn(
              "chat-markdown text-[15px] leading-relaxed",
              message.error && "text-destructive",
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}

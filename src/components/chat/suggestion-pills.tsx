"use client";

interface SuggestionPillsProps {
  suggestions: string[];
  onSelect: (text: string) => void;
}

export function SuggestionPills({ suggestions, onSelect }: SuggestionPillsProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {suggestions.map((text) => (
        <button
          key={text}
          onClick={() => onSelect(text)}
          className="rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground shadow-sm transition hover:border-primary/40 hover:bg-secondary/50"
        >
          {text}
        </button>
      ))}
    </div>
  );
}

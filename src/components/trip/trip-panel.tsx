"use client";

import { X } from "lucide-react";
import { TripChecklist, type TripDetail } from "./trip-checklist";

export type { TripDetail };

interface TripPanelProps {
  open: boolean;
  onClose: () => void;
  details: TripDetail[];
  onGenerate?: () => void;
  canGenerate?: boolean;
}

export function TripPanel({
  open,
  onClose,
  details,
  onGenerate,
  canGenerate,
}: TripPanelProps) {
  return (
    <>
      {/* mobile backdrop */}
      {open && (
        <div
          className="absolute inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={`
          absolute right-0 top-0 z-50 h-full w-full transform border-l border-border bg-card shadow-2xl
          transition-transform duration-300 ease-out
          lg:relative lg:w-[360px] lg:translate-x-0 lg:shadow-none
          ${open ? "translate-x-0" : "translate-x-full"}
        `}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center justify-between border-b border-border px-4 lg:hidden">
            <span className="font-medium">Current trip</span>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Close trip panel"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <TripChecklist
              details={details}
              onGenerate={onGenerate}
              canGenerate={canGenerate}
            />
          </div>
        </div>
      </aside>
    </>
  );
}

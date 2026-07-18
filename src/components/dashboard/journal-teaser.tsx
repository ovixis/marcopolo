import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** AI journal nudge — adapts the reference's assistant card to our journal. */
export function JournalTeaser() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col gap-3 py-5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" aria-hidden />
          <span className="text-sm font-medium">Journal AI</span>
          <span className="ml-auto rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            Preview
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Claude noticed 12 new photos from your Lisbon trip. Want a draft story
          for Day 3 — the tram ride and that bakery in Alfama?
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            nativeButton={false}
            render={<Link href="/journal" />}
          >
            Write Day 3
            <ArrowRight className="size-3.5" aria-hidden />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            nativeButton={false}
            render={<Link href="/journal" />}
          >
            Summarize trip
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ComingSoonProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Roadmap window, e.g. "Weeks 5-8". */
  phase: string;
  /** What this feature will include when it ships. */
  planned: string[];
}

export function ComingSoon({
  icon: Icon,
  title,
  description,
  phase,
  planned,
}: ComingSoonProps) {
  return (
    <div className="mx-auto max-w-2xl px-8 py-16">
      <Card>
        <CardHeader>
          <div className="mb-2 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Icon className="size-6 text-primary" aria-hidden />
            </div>
            <span className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">
              Roadmap: {phase}
            </span>
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="text-base">{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm font-medium">Planned for this feature</p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            {planned.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted-foreground">
            Want to help build it? Check{" "}
            <a
              href="https://github.com/ovixis/marcopolo/blob/main/CONTRIBUTING.md"
              className="font-medium text-foreground underline underline-offset-4"
              target="_blank"
              rel="noopener noreferrer"
            >
              CONTRIBUTING.md
            </a>{" "}
            — issues for this feature are tagged and open.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

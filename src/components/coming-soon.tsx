import type { LucideIcon } from "lucide-react";

interface ComingSoonProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Roadmap window, e.g. "Weeks 5-8". */
  phase: string;
  /** What this feature will include when it ships. */
  planned: string[];
  /** Optional Marco-voice lead-in under the title (Fraunces empty-state style). */
  leadIn?: string;
}

export function ComingSoon({
  icon: Icon,
  title,
  description,
  phase,
  planned,
  leadIn,
}: ComingSoonProps) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-8 py-16 text-center">
      <div className="rise-in flex flex-col items-center gap-3">
        <div className="grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
          <Icon className="size-7" aria-hidden />
        </div>
        <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-muted-foreground">
          Roadmap · {phase}
        </span>
        <h1 className="font-serif text-2xl text-foreground sm:text-3xl">
          {leadIn ?? title}
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      <div
        className="rise-in mt-10 w-full rounded-2xl border border-border bg-card p-6 text-left"
        style={{ animationDelay: "80ms" }}
      >
        <p className="mb-3 text-sm font-medium text-foreground">
          Charted for this feature
        </p>
        <ul className="space-y-2.5">
          {planned.map((item, i) => (
            <li
              key={item}
              className="rise-in flex items-start gap-2.5 text-sm text-muted-foreground"
              style={{ animationDelay: `${120 + i * 45}ms` }}
            >
              <span
                className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/70"
                aria-hidden
              />
              <span>{item}</span>
            </li>
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
      </div>
    </div>
  );
}

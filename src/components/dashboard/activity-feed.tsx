import { BookOpen, Camera, Plane, Wallet } from "lucide-react";

import { recentActivity } from "@/lib/demo-dashboard";

const ICONS = {
  plane: Plane,
  wallet: Wallet,
  camera: Camera,
  book: BookOpen,
} as const;

/** Compact "what happened lately" feed. */
export function ActivityFeed() {
  return (
    <ul className="flex flex-col gap-4">
      {recentActivity.map((activity) => {
        const Icon = ICONS[activity.icon];
        return (
          <li key={activity.text} className="flex items-start gap-3">
            <div className="mt-0.5 rounded-md bg-primary/10 p-1.5">
              <Icon className="size-3.5 text-primary" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm">{activity.text}</p>
              <p className="text-xs text-muted-foreground">{activity.meta}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

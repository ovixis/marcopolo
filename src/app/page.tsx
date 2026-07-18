import { AskMarco } from "@/components/chat/ask-marco";

/**
 * The unified command center: Ask Marco is the whole surface now — full width,
 * no side panel. Trip overview (budget, readiness, documents) lives on its own
 * pages reachable from the top nav.
 */
export default function Home() {
  return (
    <div className="mx-auto h-full max-w-[1400px] p-6 lg:p-8">
      <AskMarco />
    </div>
  );
}

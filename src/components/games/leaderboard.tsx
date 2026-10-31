import { Trophy } from "lucide-react";
import type { LeaderboardEntry } from "@/lib/platform/contracts";
export function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  const sorted = [...entries].sort((a, b) => b.points - a.points).slice(0, 5);
  return (
    <section className="score-list" aria-label="Your best adventures">
      <h3>
        <Trophy size={20} /> Your best adventures
      </h3>
      {sorted.length ? (
        <ol>
          {sorted.map((entry, index) => (
            <li key={entry.id}>
              <span>
                {index + 1}. {entry.label}
              </span>
              <strong>{entry.points} pts</strong>
            </li>
          ))}
        </ol>
      ) : (
        <p>Finish a bingo to start your collection!</p>
      )}
      <p className="small-note">
        Your own best scores. Every little step counts.
      </p>
    </section>
  );
}

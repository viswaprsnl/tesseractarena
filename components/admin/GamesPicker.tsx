"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { availableGames } from "@/data/games";
import { platformOf } from "@/lib/ops-config";

// Tick the games a group plays (and how many of them played each). Shown
// at check-in and editable until completion; drives the platform fees.
export function GamesPicker({
  partySize,
  initial,
  saveLabel,
  onSave,
  onCancel,
}: {
  partySize: number;
  initial: Record<string, number>;
  saveLabel: string;
  onSave: (games: Record<string, number>) => void;
  onCancel: () => void;
}) {
  const [games, setGames] = useState(initial);
  const toggle = (id: string) =>
    setGames(({ [id]: had, ...rest }) => (had ? rest : { ...rest, [id]: partySize }));
  return (
    <div className="w-full rounded-lg border border-white/10 p-3 space-y-3">
      <p className="text-xs font-semibold">Games played</p>
      <div className="flex flex-wrap gap-2">
        {availableGames.map((g) => {
          const on = g.id in games;
          return (
            <span key={g.id} className="flex items-center gap-1">
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(g.id)}
                className={`h-8 px-3 rounded-full border text-xs ${on ? "border-primary bg-primary/15" : "border-white/10 text-muted-foreground"}`}
              >
                {on ? "✓ " : ""}
                {g.title} <span className="opacity-60">· {platformOf(g.id)}</span>
              </button>
              {on && (
                <Input
                  type="number"
                  min={1}
                  aria-label={`Players on ${g.title}`}
                  value={games[g.id]}
                  onChange={(e) => setGames({ ...games, [g.id]: Math.max(1, Number(e.target.value) || 1) })}
                  className="w-14 h-8 bg-card/60 border-white/10 text-xs"
                />
              )}
            </span>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Button onClick={() => onSave(games)} disabled={!Object.keys(games).length} className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8">
          {saveLabel}
        </Button>
        <Button onClick={onCancel} variant="outline" className="border-white/20 text-xs h-8">
          Cancel
        </Button>
      </div>
    </div>
  );
}

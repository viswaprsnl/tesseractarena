"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Check, Users, Gamepad2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MAX_PLAYERS } from "@/lib/booking-config";
import { DECIDE_AT_VENUE_ID } from "@/lib/booking-types";
import { availableGames, getGamePlayerRange } from "@/data/games";
import { usePricing } from "@/hooks/use-pricing";
import { withGamePrices } from "@/lib/pricing";
import { whatsappCorporateLink } from "@/lib/contact";

interface GamePickerProps {
  partySize: number;
  selectedGame: string | null;
  onPartySizeChange: (size: number) => void;
  onGameChange: (gameId: string) => void;
  isKiosk?: boolean;
  advanceRequired?: boolean;
  // Deep-link preselect from a game card's "Book this game" button. We
  // initially show only that game so the section reads as "confirm",
  // with a "Change game" link to reveal the full grid.
  preselectedGame?: string;
}

export function GamePicker({
  partySize,
  selectedGame,
  onPartySizeChange,
  onGameChange,
  isKiosk = false,
  advanceRequired = true,
  preselectedGame,
}: GamePickerProps) {
  const [gameStatuses, setGameStatuses] = useState<
    Record<string, { status: string; hidden?: boolean }>
  >({});
  const [gridExpanded, setGridExpanded] = useState(false);

  // Live status (admin can hide / pause titles). Failure falls back to the
  // static list.
  useEffect(() => {
    fetch("/api/games/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.statuses) setGameStatuses(d.statuses);
      })
      .catch(() => {});
  }, []);

  const pricing = usePricing();
  const bookableGames = useMemo(
    () =>
      withGamePrices(availableGames, pricing).filter((g) => {
        const gs = gameStatuses[g.id];
        if (gs?.hidden) return false;
        if (gs && gs.status !== "available") return false;
        return true;
      }),
    [gameStatuses, pricing]
  );

  const prices = bookableGames.map((g) => g.pricePerPerson);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;

  const isDecideAtVenue = selectedGame === DECIDE_AT_VENUE_ID;
  const game = bookableGames.find((g) => g.id === selectedGame) ?? null;

  // Per-game player range (e.g. some titles cap at 6, Versus starts at 2).
  // With no specific game, the full 1..MAX_PLAYERS range is allowed.
  const [gMin, gMax] = game ? getGamePlayerRange(game.players) : [1, MAX_PLAYERS];
  const maxPlayers = Math.min(MAX_PLAYERS, gMax);
  const minPlayers = Math.max(1, gMin);

  const clampSize = (size: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, size));

  const handleGameSelect = (gameId: string) => {
    onGameChange(gameId);
    if (gameId === DECIDE_AT_VENUE_ID) return;
    const picked = bookableGames.find((g) => g.id === gameId);
    if (!picked) return;
    const [lo, hi] = getGamePlayerRange(picked.players);
    const clamped = clampSize(partySize, Math.max(1, lo), Math.min(MAX_PLAYERS, hi));
    if (clamped !== partySize) onPartySizeChange(clamped);
  };

  const isDeepLinked =
    !!preselectedGame &&
    !gridExpanded &&
    bookableGames.some((g) => g.id === preselectedGame);
  const visibleGames = isDeepLinked
    ? bookableGames.filter((g) => g.id === preselectedGame)
    : bookableGames;

  return (
    <div className="space-y-6">
      {/* Players — first, because it's one tap and it drives the price
          the customer sees on every game card below. */}
      <div
        data-players-stepper
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-secondary/20 px-4 py-3 scroll-mt-24"
      >
        <div>
          <p className="text-sm font-medium flex items-center gap-2">
            <Users size={16} className="text-primary" />
            How many players?
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {game && (maxPlayers < MAX_PLAYERS || minPlayers > 1)
              ? `${game.title} supports ${game.players} players`
              : `Up to ${MAX_PLAYERS} per session · the arena is all yours`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Fewer players"
            onClick={() => onPartySizeChange(clampSize(partySize - 1, minPlayers, maxPlayers))}
            disabled={partySize <= minPlayers}
            className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 disabled:opacity-30 transition-colors"
          >
            <Minus size={16} />
          </button>
          <span className="text-2xl font-bold w-8 text-center tabular-nums" aria-live="polite">
            {partySize}
          </span>
          <button
            type="button"
            aria-label="More players"
            onClick={() => onPartySizeChange(clampSize(partySize + 1, minPlayers, maxPlayers))}
            disabled={partySize >= maxPlayers}
            className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 disabled:opacity-30 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Gamepad2 size={12} className="text-primary" />
            {isDeepLinked ? "Your game" : "Choose your game"}
          </p>
          {!selectedGame && (
            <span className="text-[10px] text-muted-foreground">Price shown per person</span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[420px] overflow-y-auto pr-1 -mr-1">
          {!isDeepLinked && (
            <button
              type="button"
              onClick={() => handleGameSelect(DECIDE_AT_VENUE_ID)}
              aria-pressed={isDecideAtVenue}
              className={`col-span-2 sm:col-span-3 glass-card p-4 text-left relative transition-all flex items-center gap-3 ${
                isDecideAtVenue
                  ? "border-primary/60 glow-violet ring-1 ring-primary/30"
                  : "hover:border-primary/30 border-primary/20"
              }`}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                <Gamepad2 size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">
                  {isKiosk ? "Ask the staff to recommend" : "Not sure yet? Pick at the arena"}
                </p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {isKiosk
                    ? "The counter team will suggest a game that fits your group."
                    : "Hold the slot now, choose your title on the day."}{" "}
                  {minPrice > 0 && maxPrice > minPrice && (
                    <span className="text-primary/80">
                      ₹{minPrice.toLocaleString("en-IN")}–₹{maxPrice.toLocaleString("en-IN")}/person
                    </span>
                  )}
                </p>
              </div>
              {isDecideAtVenue && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Check size={12} className="text-primary-foreground" />
                </div>
              )}
            </button>
          )}

          {visibleGames.map((g) => {
            const isSelected = selectedGame === g.id;
            return (
              <button
                type="button"
                key={g.id}
                onClick={() => handleGameSelect(g.id)}
                aria-pressed={isSelected}
                className={`glass-card overflow-hidden text-left relative transition-all group ${
                  isSelected ? "border-primary/60 glow-violet ring-1 ring-primary/30" : "hover:border-white/20"
                }`}
              >
                <div className="relative aspect-[16/10] bg-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={g.image}
                    alt={g.title}
                    loading="lazy"
                    className={`w-full h-full object-cover transition-transform ${
                      isSelected ? "" : "group-hover:scale-105"
                    }`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <Badge className="absolute top-2 right-2 bg-black/70 text-white text-[9px] backdrop-blur-sm">
                    ₹{g.pricePerPerson.toLocaleString("en-IN")}
                  </Badge>
                  {isSelected ? (
                    <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-lg">
                      <Check size={12} className="text-primary-foreground" />
                    </div>
                  ) : (
                    (g.featured || g.kidsFriendly) && (
                      <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                        {g.featured && (
                          <Badge className="bg-primary text-primary-foreground text-[9px]">Most Played</Badge>
                        )}
                        {g.kidsFriendly && (
                          <Badge className="bg-green-500 text-white text-[9px]">Kids Friendly</Badge>
                        )}
                      </div>
                    )
                  )}
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-xs font-semibold text-white leading-tight line-clamp-2">{g.title}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {isDeepLinked && (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={() => setGridExpanded(true)}
              className="text-xs text-primary hover:text-primary/80 underline underline-offset-4 decoration-primary/40 hover:decoration-primary transition-colors"
            >
              Change game — show all titles
            </button>
          </div>
        )}

        {game && (
          <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
            <span className="text-primary font-medium">{game.title}</span> — {game.description}
          </p>
        )}
        {isDecideAtVenue && (
          <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
            {isKiosk
              ? "Final price is locked once you pick with the staff."
              : advanceRequired
              ? "The total shown is the upper bound. You only pay the small advance now; the final price is set at the counter based on what you play."
              : "The total shown is the upper bound; the final price is set at the counter based on what you play."}
          </p>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground/80">
        Booking for 9+ players or a corporate event?{" "}
        <a
          href={whatsappCorporateLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Get a custom quote →
        </a>
      </p>
    </div>
  );
}

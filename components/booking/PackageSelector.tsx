"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Check, Users, Tag, Gamepad2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  calculateSessionPrice,
  getPackageForSize,
  calculateAdvance,
  perHeadAtTier,
  withGST,
  gstOn,
  GST_PERCENT,
  MAX_PLAYERS,
} from "@/lib/booking-config";
import type { PackageType, PerPersonPackageType } from "@/lib/booking-types";
import {
  applyDiscount,
  pickActiveDiscount,
  formatDiscountBadge,
  type Discount,
} from "@/lib/discount-config";
import type { ActiveDiscount } from "@/hooks/use-booking";
import { availableGames, getGamePlayerRange } from "@/data/games";
import { whatsappCorporateLink } from "@/lib/contact";

// Sentinel game id for "I'll decide when I arrive". Not a real game in
// data/games.ts; treated specially throughout the booking flow so the
// customer can hold the slot without picking a specific title. Server
// treats this as "use the max-priced game as the ceiling" — actual
// price is adjusted at the counter based on what they finally play.
export const DECIDE_AT_VENUE_ID = "decide-at-venue";

interface PackageSelectorProps {
  partySize: number;
  packageType: PackageType;
  sessionDate: string | null;
  selectedGame: string | null;
  onPartySizeChange: (size: number) => void;
  onPackageChange: (pkg: PackageType) => void;
  onGameChange: (gameId: string | null) => void;
  onDiscountChange?: (discount: ActiveDiscount | null) => void;
}

const packages = [
  {
    type: "solo" as const,
    name: "Solo",
    desc: "1 player",
    range: "1 player",
  },
  {
    type: "squad" as const,
    name: "Squad",
    desc: "2-5 players",
    range: "2-5 players",
    popular: true,
  },
  {
    type: "party" as const,
    name: "Party",
    desc: "6-8 players",
    range: "6-8 players",
  },
];

export function PackageSelector({
  partySize,
  packageType,
  sessionDate,
  selectedGame,
  onPartySizeChange,
  onPackageChange,
  onGameChange,
  onDiscountChange,
}: PackageSelectorProps) {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [gameStatuses, setGameStatuses] = useState<Record<string, { status: string; hidden?: boolean }>>({});

  // Games available for booking. Any admin-hidden / non-available game is
  // filtered out so the dropdown only offers real choices.
  const bookableGames = useMemo(
    () =>
      availableGames.filter((g) => {
        const gs = gameStatuses[g.id];
        if (gs?.hidden) return false;
        if (gs && gs.status !== "available") return false;
        return true;
      }),
    [gameStatuses]
  );

  // Live-status fetch runs once. Failure falls back to the raw game list.
  useEffect(() => {
    fetch("/api/games/status")
      .then((r) => r.json())
      .then((d) => { if (d.statuses) setGameStatuses(d.statuses); })
      .catch(() => {});
  }, []);

  const isDecideAtVenue = selectedGame === DECIDE_AT_VENUE_ID;
  const game = bookableGames.find((g) => g.id === selectedGame) ?? null;

  // Highest ex-GST per-head price across the Available library. Used as
  // the ceiling when the customer picks "Decide at venue" — the visible
  // total shows the upper-bound and gets adjusted downward at the counter
  // if they end up choosing a cheaper HeroZone title.
  const maxAvailablePrice = useMemo(
    () =>
      bookableGames.length
        ? Math.max(...bookableGames.map((g) => g.pricePerPerson))
        : 0,
    [bookableGames]
  );
  const minAvailablePrice = useMemo(
    () =>
      bookableGames.length
        ? Math.min(...bookableGames.map((g) => g.pricePerPerson))
        : 0,
    [bookableGames]
  );

  const perHeadBase = isDecideAtVenue
    ? maxAvailablePrice
    : game?.pricePerPerson ?? 0;

  // Per-game player range — Anvio 30-min titles cap at 6; Revolta at 8;
  // Versus starts at 2. When no game is picked (or "Decide at venue" is
  // picked) the full 1..MAX_PLAYERS range is allowed and every tier is
  // available; once a specific game is picked the stepper and Party card
  // clamp to what that specific game supports.
  const [gameMinPlayers, gameMaxPlayers] = game
    ? getGamePlayerRange(game.players)
    : [1, MAX_PLAYERS];
  const effectiveMax = isDecideAtVenue
    ? MAX_PLAYERS
    : Math.min(MAX_PLAYERS, gameMaxPlayers);
  const effectiveMin = isDecideAtVenue ? 1 : Math.max(1, gameMinPlayers);
  const partySupported = effectiveMax >= 6;
  const soloSupported = effectiveMin <= 1;

  // Fetch active discounts once per session date. Filtering per-package
  // happens client-side with pickActiveDiscount, so a single request covers
  // all three cards.
  useEffect(() => {
    if (!sessionDate) return;
    let cancelled = false;
    fetch(`/api/discounts?date=${sessionDate}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.discounts) setDiscounts(data.discounts);
      })
      .catch(() => {
        // Silently fall back to no-discount pricing.
      });
    return () => {
      cancelled = true;
    };
  }, [sessionDate]);

  // Session pricing is now game-driven. When no game is selected yet the
  // total shows as ₹0 and Continue is blocked at the wizard level.
  const perPersonPkg = packageType as PerPersonPackageType;
  const baseTotal = perHeadBase
    ? calculateSessionPrice(perHeadBase, perPersonPkg, partySize)
    : 0;
  const activeDiscount = sessionDate && perHeadBase
    ? pickActiveDiscount(discounts, sessionDate, packageType, baseTotal)
    : null;
  const amount = activeDiscount ? applyDiscount(baseTotal, activeDiscount) : baseTotal;
  const savings = baseTotal - amount;

  // Bubble the resolved discount up to the wizard so the summary + booking
  // POST share the same view of "what's on sale right now".
  useEffect(() => {
    if (!onDiscountChange) return;
    if (!activeDiscount) {
      onDiscountChange(null);
      return;
    }
    onDiscountChange({
      id: activeDiscount.id,
      label: activeDiscount.label,
      type: activeDiscount.type,
      value: activeDiscount.value,
      badge: formatDiscountBadge(activeDiscount),
      amountOff: savings,
    });
    // activeDiscount identity changes each render — depend on primitives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDiscount?.id, savings]);

  const handleSizeChange = (newSize: number) => {
    // Clamp to the intersection of the global cap and the current game's
    // supported range. Without a game picked yet, the full 1..MAX_PLAYERS
    // range is allowed.
    const upper = game ? effectiveMax : MAX_PLAYERS;
    const lower = game ? effectiveMin : 1;
    const clamped = Math.max(lower, Math.min(upper, newSize));
    onPartySizeChange(clamped);
    onPackageChange(getPackageForSize(clamped));
  };

  // When switching games, clamp the current party size down (or up) to
  // whatever the newly-picked game supports, and rebalance the tier.
  // "Decide at venue" opens up the full 1..MAX_PLAYERS range since we
  // don't know which title's cap will apply yet.
  const handleGameSelect = (gameId: string) => {
    onGameChange(gameId);
    if (gameId === DECIDE_AT_VENUE_ID) return;
    const picked = bookableGames.find((g) => g.id === gameId);
    if (!picked) return;
    const [gMin, gMax] = getGamePlayerRange(picked.players);
    const upper = Math.min(MAX_PLAYERS, gMax);
    const lower = Math.max(1, gMin);
    if (partySize > upper || partySize < lower) {
      const clamped = Math.max(lower, Math.min(upper, partySize));
      onPartySizeChange(clamped);
      onPackageChange(getPackageForSize(clamped));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <h3 className="font-heading text-lg font-bold text-center mb-6">
        Pick a Game &amp; Package
      </h3>

      {/* Game picker — a visual card strip beats a native <select> here,
          both because parents / groups shop games by looking at them, and
          because it lets us surface the per-person price prominently on
          each card. Selection drives the pricing on the tier cards below. */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Gamepad2 size={12} className="text-primary" />
            Choose your game
          </label>
          {!selectedGame && (
            <span className="text-[10px] text-muted-foreground">
              Tap a card to lock in the price →
            </span>
          )}
        </div>
        <div
          className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[360px] overflow-y-auto pr-1 -mr-1"
        >
          {/* "Decide at venue" tile — mirrors Enter Totem's flow. Spans the
              full row width, distinct primary-tinted style, sits above the
              real games so it reads as the "pick nothing specific yet" out. */}
          {(() => {
            const isSelected = selectedGame === DECIDE_AT_VENUE_ID;
            return (
              <button
                onClick={() => handleGameSelect(DECIDE_AT_VENUE_ID)}
                className={`col-span-2 sm:col-span-3 glass-card p-4 text-left relative transition-all flex items-center gap-3 ${
                  isSelected
                    ? "border-primary/60 glow-violet ring-1 ring-primary/30"
                    : "hover:border-primary/30 border-primary/20"
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                  <Gamepad2 size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Decide at venue</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Choose or change your game at the arena on the day.{" "}
                    {minAvailablePrice > 0 && maxAvailablePrice > minAvailablePrice && (
                      <span className="text-primary/80">
                        ₹{minAvailablePrice.toLocaleString("en-IN")}–₹
                        {maxAvailablePrice.toLocaleString("en-IN")}/head
                      </span>
                    )}
                  </p>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Check size={12} className="text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })()}
          {bookableGames.map((g) => {
            const isSelected = selectedGame === g.id;
            return (
              <button
                key={g.id}
                onClick={() => handleGameSelect(g.id)}
                className={`glass-card overflow-hidden text-left relative transition-all group ${
                  isSelected
                    ? "border-primary/60 glow-violet ring-1 ring-primary/30"
                    : "hover:border-white/20"
                }`}
              >
                <div className="relative aspect-[16/10] bg-card">
                  {/* Using <img> instead of next/image so we don't have to
                      configure remote hosts for every game asset on this
                      compact tile. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={g.image}
                    alt={g.title}
                    className={`w-full h-full object-cover transition-transform ${
                      isSelected ? "" : "group-hover:scale-105"
                    }`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <Badge className="absolute top-2 right-2 bg-black/70 text-white text-[9px] backdrop-blur-sm">
                    ₹{g.pricePerPerson.toLocaleString("en-IN")}
                  </Badge>
                  {isSelected && (
                    <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-lg">
                      <Check size={12} className="text-primary-foreground" />
                    </div>
                  )}
                  {!isSelected && (g.featured || g.kidsFriendly) && (
                    <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                      {g.featured && (
                        <Badge className="bg-primary text-primary-foreground text-[9px]">
                          Most Played
                        </Badge>
                      )}
                      {g.kidsFriendly && (
                        <Badge className="bg-green-500 text-white text-[9px]">
                          Kids Friendly
                        </Badge>
                      )}
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-xs font-semibold text-white leading-tight line-clamp-2">
                      {g.title}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {game && (
          <div className="glass-card p-3 mt-3">
            <p className="text-[11px] text-muted-foreground">
              <span className="text-primary font-medium">{game.title}</span> —{" "}
              {game.description}
            </p>
          </div>
        )}
        {isDecideAtVenue && (
          <div className="glass-card p-3 mt-3 border-primary/20">
            <p className="text-[11px] text-muted-foreground">
              <span className="text-primary font-medium">Decide at venue</span> —{" "}
              you pay just the ₹500/head advance now; final price is locked
              at the counter based on the title you pick.
            </p>
          </div>
        )}
      </div>

      {/* Party size stepper */}
      <div className="flex flex-col items-center gap-2 mb-8">
        <div className="flex items-center justify-center gap-6">
          <span className="text-sm text-muted-foreground flex items-center gap-2">
            <Users size={16} className="text-primary" />
            Players
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSizeChange(partySize - 1)}
              disabled={partySize <= effectiveMin}
              className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 disabled:opacity-30 transition-colors"
            >
              <Minus size={16} />
            </button>
            <span className="text-2xl font-bold w-10 text-center">
              {partySize}
            </span>
            <button
              onClick={() => handleSizeChange(partySize + 1)}
              disabled={partySize >= effectiveMax}
              className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 disabled:opacity-30 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
        {game && (effectiveMax < MAX_PLAYERS || effectiveMin > 1) && (
          <p className="text-[10px] text-muted-foreground">
            {game.title} supports {game.players} players
          </p>
        )}
      </div>

      {/* Package cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {packages.map((pkg) => {
          const isSelected = packageType === pkg.type;
          // Per-head price for this tier of the currently-chosen game.
          // Falls back to zero (rendered as "—") while no game is picked.
          const perPersonBase = perHeadBase
            ? perHeadAtTier(perHeadBase, pkg.type)
            : 0;
          const cardBaseTotal = perPersonBase * Math.max(1, partySize);
          const cardDiscount = sessionDate && perPersonBase
            ? pickActiveDiscount(discounts, sessionDate, pkg.type, cardBaseTotal)
            : null;
          const cardTotal = cardDiscount ? applyDiscount(cardBaseTotal, cardDiscount) : cardBaseTotal;
          const perPersonAfter = Math.round(cardTotal / Math.max(1, partySize));
          const showDiscount = cardDiscount && cardTotal < cardBaseTotal;

          const tierDisabled =
            (pkg.type === "solo" && !soloSupported) ||
            (pkg.type === "party" && !partySupported);
          return (
            <button
              key={pkg.type}
              disabled={tierDisabled}
              onClick={() => {
                if (tierDisabled) return;
                onPackageChange(pkg.type);
                if (pkg.type === "solo") onPartySizeChange(1);
                else if (pkg.type === "squad" && (partySize < 2 || partySize > 5))
                  onPartySizeChange(Math.max(2, effectiveMin));
                else if (pkg.type === "party" && partySize < 6)
                  onPartySizeChange(6);
              }}
              className={`glass-card p-5 text-left relative transition-all ${
                tierDisabled
                  ? "opacity-40 cursor-not-allowed"
                  : isSelected
                  ? "border-primary/40 glow-violet"
                  : "hover:border-white/20"
              }`}
            >
              {pkg.popular && (
                <Badge className="absolute -top-2 left-4 bg-primary text-primary-foreground text-[10px]">
                  Popular
                </Badge>
              )}
              {showDiscount && cardDiscount && (
                <Badge className="absolute -top-2 right-4 bg-green-500/90 text-white text-[10px] flex items-center gap-1">
                  <Tag size={10} /> {formatDiscountBadge(cardDiscount)}
                </Badge>
              )}
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-heading text-base font-bold">{pkg.name}</h4>
                {isSelected && <Check size={16} className="text-primary" />}
              </div>
              {!perHeadBase ? (
                <p className="text-2xl font-bold mb-1 text-muted-foreground">
                  —
                  <span className="text-xs text-muted-foreground font-normal ml-1">
                    /person
                  </span>
                </p>
              ) : showDiscount ? (
                <div className="mb-1">
                  <span className="text-xs text-muted-foreground line-through mr-2">
                    ₹{perPersonBase.toLocaleString("en-IN")}
                  </span>
                  <span className="text-2xl font-bold text-green-400">
                    ₹{perPersonAfter.toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs text-muted-foreground font-normal ml-1">
                    /person
                  </span>
                </div>
              ) : (
                <p className="text-2xl font-bold mb-1">
                  ₹{perPersonBase.toLocaleString("en-IN")}
                  <span className="text-xs text-muted-foreground font-normal ml-1">
                    /person
                  </span>
                </p>
              )}
              <p className="text-xs text-muted-foreground">{pkg.range}</p>
              {perHeadBase > 0 && (
                <p className="text-[9px] text-muted-foreground/70 mt-0.5">
                  excl. GST
                </p>
              )}
              {pkg.type !== "solo" && perHeadBase > 0 && (
                <p className="text-[10px] text-primary/70 mt-1">
                  {pkg.type === "squad" ? "10% off/head" : "15% off/head"}
                </p>
              )}
              {tierDisabled && game && (
                <p className="text-[10px] text-amber-400/80 mt-1">
                  Not available on {game.title}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Total + advance breakdown — session cost shown ex-GST (revenue
          basis) with a GST line added so the customer sees the actual
          amount Razorpay will charge. Enter Totem's checkout pattern. */}
      <div className="glass-card p-5">
        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground mb-1">Session cost (excl. GST)</p>
          {activeDiscount && savings > 0 ? (
            <>
              <p className="text-lg text-muted-foreground line-through leading-none">
                ₹{baseTotal.toLocaleString("en-IN")}
              </p>
              <p className="text-3xl font-bold text-green-400">
                ₹{amount.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-green-400 mt-1">
                {activeDiscount.label} — you save ₹{savings.toLocaleString("en-IN")}
              </p>
            </>
          ) : (
            <p className="text-3xl font-bold">
              ₹{amount.toLocaleString("en-IN")}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {game
              ? `${partySize} × ₹${perHeadAtTier(perHeadBase, perPersonPkg).toLocaleString("en-IN")} (${packageType}${packageType === "solo" ? "" : packageType === "squad" ? " · 10% off" : " · 15% off"}) — ${game.title}`
              : isDecideAtVenue
              ? `Up to ${partySize} × ₹${perHeadAtTier(perHeadBase, perPersonPkg).toLocaleString("en-IN")} — final price locked at venue`
              : "Pick a game above to see the total"}
          </p>
        </div>

        {amount > 0 && (
          <div className="border-t border-border pt-3 pb-3 space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">GST @ {GST_PERCENT}%</span>
              <span className="text-muted-foreground">
                + ₹{gstOn(amount).toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium">Total (incl. GST)</span>
              <span className="font-bold">
                ₹{withGST(amount).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        )}

        <div className="border-t border-border pt-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Pay now (advance, incl. GST)
            </span>
            <span className="text-sm font-bold text-primary">
              ₹{withGST(calculateAdvance(partySize, amount)).toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Pay at center (incl. GST)
            </span>
            <span className="text-sm font-medium">
              ₹{withGST(amount - calculateAdvance(partySize, amount)).toLocaleString("en-IN")}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/70 pt-1">
            Just ₹500 per person (+ GST) reserves your slot. Pay the rest when you arrive.
          </p>
        </div>
      </div>

      {/* Corporate escape hatch — anything beyond the 8-player Party cap or
          a bespoke team event routes to WhatsApp. Kept subtle so it doesn't
          distract from the self-serve flow. */}
      <p className="text-[11px] text-center text-muted-foreground/80 mt-6">
        Booking for 9+ players or a corporate event?{" "}
        <a
          href={whatsappCorporateLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Contact us for a custom quote →
        </a>
      </p>
    </motion.div>
  );
}

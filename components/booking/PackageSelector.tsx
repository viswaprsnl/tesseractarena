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
import { availableGames } from "@/data/games";

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
    fetch("/api/admin/games")
      .then((r) => r.json())
      .then((d) => { if (d.statuses) setGameStatuses(d.statuses); })
      .catch(() => {});
  }, []);

  const game = bookableGames.find((g) => g.id === selectedGame) ?? null;
  const perHeadBase = game?.pricePerPerson ?? 0;

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
    const clamped = Math.max(1, Math.min(MAX_PLAYERS, newSize));
    onPartySizeChange(clamped);
    onPackageChange(getPackageForSize(clamped));
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
          {bookableGames.map((g) => {
            const isSelected = selectedGame === g.id;
            return (
              <button
                key={g.id}
                onClick={() => onGameChange(g.id)}
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
      </div>

      {/* Party size stepper */}
      <div className="flex items-center justify-center gap-6 mb-8">
        <span className="text-sm text-muted-foreground flex items-center gap-2">
          <Users size={16} className="text-primary" />
          Players
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSizeChange(partySize - 1)}
            disabled={partySize <= 1}
            className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 disabled:opacity-30 transition-colors"
          >
            <Minus size={16} />
          </button>
          <span className="text-2xl font-bold w-10 text-center">
            {partySize}
          </span>
          <button
            onClick={() => handleSizeChange(partySize + 1)}
            disabled={partySize >= MAX_PLAYERS}
            className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 disabled:opacity-30 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
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

          return (
            <button
              key={pkg.type}
              onClick={() => {
                onPackageChange(pkg.type);
                if (pkg.type === "solo") onPartySizeChange(1);
                else if (pkg.type === "squad" && (partySize < 2 || partySize > 5))
                  onPartySizeChange(2);
                else if (pkg.type === "party" && partySize < 6)
                  onPartySizeChange(6);
              }}
              className={`glass-card p-5 text-left relative transition-all ${
                isSelected
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
              {pkg.type !== "solo" && perHeadBase > 0 && (
                <p className="text-[10px] text-primary/70 mt-1">
                  {pkg.type === "squad" ? "10% off/head" : "20% off/head"}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Total + advance breakdown */}
      <div className="glass-card p-5">
        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground mb-1">Total Session Cost</p>
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
              ? `${partySize} × ₹${perHeadAtTier(perHeadBase, perPersonPkg).toLocaleString("en-IN")} (${packageType}${packageType === "solo" ? "" : packageType === "squad" ? " · 10% off" : " · 20% off"}) — ${game.title}`
              : "Pick a game above to see the total"}
          </p>
        </div>

        <div className="border-t border-border pt-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Pay now (advance)
            </span>
            <span className="text-sm font-bold text-primary">
              ₹{calculateAdvance(partySize, amount).toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Pay at center
            </span>
            <span className="text-sm font-medium">
              ₹{(amount - calculateAdvance(partySize, amount)).toLocaleString("en-IN")}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/70 pt-1">
            Just ₹500 per person reserves your slot. Pay the rest when you arrive.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

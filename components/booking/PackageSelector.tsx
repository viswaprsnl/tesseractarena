"use client";

import { motion } from "framer-motion";
import { Minus, Plus, Check, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  PRICING,
  calculatePrice,
  getPackageForSize,
  MAX_PLAYERS,
} from "@/lib/booking-config";
import type { PackageType } from "@/lib/booking-types";

interface PackageSelectorProps {
  partySize: number;
  packageType: PackageType;
  onPartySizeChange: (size: number) => void;
  onPackageChange: (pkg: PackageType) => void;
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
    desc: "6-10 players",
    range: "6-10 players",
  },
];

export function PackageSelector({
  partySize,
  packageType,
  onPartySizeChange,
  onPackageChange,
}: PackageSelectorProps) {
  const amount = calculatePrice(packageType, partySize);

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
        Choose Your Package
      </h3>

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
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-heading text-base font-bold">{pkg.name}</h4>
                {isSelected && <Check size={16} className="text-primary" />}
              </div>
              <p className="text-2xl font-bold mb-1">
                ₹{PRICING[pkg.type]}
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  /person
                </span>
              </p>
              <p className="text-xs text-muted-foreground">{pkg.range}</p>
            </button>
          );
        })}
      </div>

      {/* Total */}
      <div className="glass-card p-5 text-center">
        <p className="text-sm text-muted-foreground mb-1">Estimated Total</p>
        <p className="text-3xl font-bold">
          ₹{amount.toLocaleString("en-IN")}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {partySize} {partySize === 1 ? "player" : "players"} × ₹
          {PRICING[packageType]} ({packageType})
        </p>
      </div>
    </motion.div>
  );
}

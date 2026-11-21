"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { availableGames, comingSoonGames } from "@/data/games";
import { BIRTHDAY_ADDONS } from "@/data/birthday";
import { resolvePricing, type Pricing } from "@/lib/pricing";
import { FOOD_MENU, resolveOps, type Ops } from "@/lib/ops-config";

// The one place to change prices. Saves to the Settings sheet; the site,
// kiosk, birthday page and admin forms pick it up within about a minute.
// All amounts ex-GST. Discounts and coupons stay on the Discounts tab.
export function PricingTab({ ownerPin }: { ownerPin: string }) {
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [ops, setOps] = useState<Ops | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/settings?pin=${encodeURIComponent(ownerPin)}`)
      .then((r) => r.json())
      .then((d) => {
        setPricing(resolvePricing(d.resolved?.pricing));
        setOps(resolveOps(d.resolved?.ops));
      })
      .catch(() => setMessage("Couldn't load prices"));
  }, [ownerPin]);

  if (!pricing || !ops) {
    return message ? (
      <p className="text-center text-sm text-destructive">{message}</p>
    ) : (
      <Loader2 className="animate-spin text-primary mx-auto" size={28} />
    );
  }

  const setTop = (k: "advancePerPerson" | "birthdayPerKid" | "birthdayAdvancePercent", v: number) =>
    setPricing({ ...pricing, [k]: v });
  const setIn = (k: "games" | "birthdayAddons", id: string, v: number) =>
    setPricing({ ...pricing, [k]: { ...pricing[k], [id]: v } });

  const save = async () => {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/admin/settings?pin=${encodeURIComponent(ownerPin)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pricing, ops }),
    }).catch(() => null);
    setMessage(res?.ok ? "Saved — live on the site within a minute." : "Save failed — try again.");
    setBusy(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <p className="text-xs text-muted-foreground text-center">
        All prices are per person and exclude GST. Discounts and coupons are on the Discounts tab.
      </p>

      <Group title="Booking rules">
        <Row label="Online advance per person" value={pricing.advancePerPerson} onChange={(v) => setTop("advancePerPerson", v)} />
        <Row label="Birthday price per kid" value={pricing.birthdayPerKid} onChange={(v) => setTop("birthdayPerKid", v)} />
        <Row label="Birthday advance (%)" value={pricing.birthdayAdvancePercent} suffix="%" onChange={(v) => setTop("birthdayAdvancePercent", v)} />
        {BIRTHDAY_ADDONS.map((a) => (
          <Row
            key={a.id}
            label={`${a.label} (${a.unit === "per-kid" ? "per kid" : "flat"})`}
            value={pricing.birthdayAddons[a.id]}
            onChange={(v) => setIn("birthdayAddons", a.id, v)}
          />
        ))}
      </Group>

      <Group title="Events (admin bookings only)">
        <Row label="Corporate price per person (2 games)" value={ops.corporatePerHead} onChange={(v) => setOps({ ...ops, corporatePerHead: v })} />
        {FOOD_MENU.map((m) => (
          <Row key={m.id} label={`${m.label} · per person (5% GST)`} value={ops.food[m.id]} onChange={(v) => setOps({ ...ops, food: { ...ops.food, [m.id]: v } })} />
        ))}
      </Group>

      <Group title="Game platform fees (owner analytics)">
        <Row label="Anvio fee — % of list price incl. GST" value={ops.anvioPercent} suffix="%" onChange={(v) => setOps({ ...ops, anvioPercent: v })} />
        <Row label="Anvio fee for birthday kids — ₹ each (0 = same %)" value={ops.birthdayAnvioPerKid} onChange={(v) => setOps({ ...ops, birthdayAnvioPerKid: v })} />
        <Row label="HeroZone fee per player per game" value={ops.heroZonePerPlay} onChange={(v) => setOps({ ...ops, heroZonePerPlay: v })} />
      </Group>

      <Group title="Bills">
        <label className="flex items-center justify-between gap-3 py-2 text-sm">
          <span>Google review link (sent with every bill)</span>
          <Input
            value={ops.reviewLink}
            onChange={(e) => setOps({ ...ops, reviewLink: e.target.value })}
            placeholder="https://g.page/r/…/review"
            className="w-72 h-8 bg-card/60 border-white/10 text-sm"
          />
        </label>
      </Group>

      <Group title="Games — bookable now">
        {availableGames.map((g) => (
          <Row key={g.id} label={g.title} value={pricing.games[g.id]} onChange={(v) => setIn("games", g.id, v)} />
        ))}
      </Group>

      <details>
        <summary className="cursor-pointer text-sm text-muted-foreground mb-3">Coming-soon games</summary>
        <Group title="">
          {comingSoonGames.map((g) => (
            <Row key={g.id} label={g.title} value={pricing.games[g.id]} onChange={(v) => setIn("games", g.id, v)} />
          ))}
        </Group>
      </details>

      <div className="glass-card flex items-center gap-3 p-3 sticky bottom-4">
        <Button onClick={save} disabled={busy} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {busy && <Loader2 size={14} className="animate-spin mr-1" />}
          Save
        </Button>
        {message && <span className="text-xs text-muted-foreground">{message}</span>}
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass-card p-4 sm:p-5">
      {title && <h3 className="font-heading text-sm font-bold mb-3">{title}</h3>}
      <div className="divide-y divide-white/5">{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
  suffix = "₹",
  onChange,
}: {
  label: string;
  value: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="min-w-0 truncate">{label}</span>
      <span className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs text-muted-foreground">{suffix}</span>
        <Input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="w-24 h-8 bg-card/60 border-white/10 text-right text-sm"
        />
      </span>
    </label>
  );
}

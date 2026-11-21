"use client";

import { useEffect, useState } from "react";
import { addMonths, format } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { getTodayISTString } from "@/lib/booking-config";
import { formatIndianCompact, formatIndianFull } from "@/lib/revenue-config";

// Chart series colours, fixed order, checked for colour-blind separation
// on the dark card surface. Anvio = C[0], HeroZone = C[2], money out = C[1].
const C = ["#8b6cff", "#d95926", "#19a7bd", "#c98500", "#d55181"];
const GOOD = "#5ee0a0";
const SOURCE: Record<string, string> = {
  website: "Website", kiosk: "Kiosk", walkin: "Walk-in", phone: "Phone", birthday: "Birthday", corporate: "Corporate",
};

interface Kpi { received: number; profit: number; gst: number; sessions: number; players: number }
interface Overview {
  daily: { date: string; in: number; out: number; gst: number }[];
  kpi: Kpi;
  waterfall: { tickets: number; foodMargin: number; fees: number; expenses: number; profit: number };
  totals: { foodIn: number; foodOut: number; monthlyBills: number; out: number };
  gst: { play: number; food: number };
  costs: [string, number][];
  methods: [string, number][];
  sources: [string, number][];
  games: { id: string; title: string; platform: string; plays: number; fee: number }[];
  untracked: number;
  compare: { days: number; now: Kpi; prev: Kpi; prevGames: { id: string; plays: number }[] };
}

// Owner → Overview: the month at a glance. Headline tiles, money in vs out
// per day, how revenue turned into profit, GST owed, and what got played.
export function OwnerOverview({ pin }: { pin: string }) {
  const [month, setMonth] = useState(getTodayISTString().slice(0, 7));
  const [loaded, setLoaded] = useState<{ month: string; data: Overview } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/admin/overview?month=${month}&pin=${encodeURIComponent(pin)}`)
      .then(async (r) => {
        const body = await r.json();
        if (!live) return;
        if (r.ok) setLoaded({ month, data: body });
        else setError(body.error || "Failed to load");
      })
      .catch(() => live && setError("Failed to load"));
    return () => {
      live = false;
    };
  }, [month, pin]);

  const first = new Date(`${month}-01T00:00:00`);
  const d = loaded?.month === month ? loaded.data : null;
  const shift = (n: number) => {
    setError(null);
    setMonth(format(addMonths(first, n), "yyyy-MM"));
  };

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center justify-center gap-3">
        <button onClick={() => shift(-1)} className="p-2 rounded-lg hover:bg-secondary" aria-label="Previous month">
          <ChevronLeft size={18} />
        </button>
        <h2 className="font-heading text-base tracking-wider w-48 text-center">{format(first, "MMMM yyyy")}</h2>
        <button onClick={() => shift(1)} className="p-2 rounded-lg hover:bg-secondary" aria-label="Next month">
          <ChevronRight size={18} />
        </button>
      </div>
      {error && <p className="text-center text-sm text-destructive">{error}</p>}
      {!d ? !error && <Loader2 className="animate-spin text-primary mx-auto" size={28} /> : <Body d={d} prevLabel={format(addMonths(first, -1), "MMM")} />}
    </div>
  );
}

function Body({ d, prevLabel }: { d: Overview; prevLabel: string }) {
  const { now, prev, days } = d.compare;
  const vs = `vs 1–${days} ${prevLabel}`;
  const net = d.kpi.received - d.kpi.gst - d.totals.out;
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label="Received" value={formatIndianFull(d.kpi.received)} sub="incl. GST" delta={pct(now.received, prev.received)} vs={vs}>
          <Spark values={d.daily.map((x) => x.in)} />
        </Tile>
        <Tile label="Profit" value={formatIndianFull(d.kpi.profit)} sub="after fees & expenses" delta={pct(now.profit, prev.profit)} vs={vs} tone={d.kpi.profit >= 0 ? GOOD : C[1]} />
        <Tile label="GST collected" value={formatIndianFull(d.kpi.gst)} sub="owed to the government" />
        <Tile label="Plays" value={`${d.kpi.sessions}`} sub={`${d.kpi.players} players`} delta={pct(now.sessions, prev.sessions)} vs={vs} />
      </div>

      <Card title="Money in vs money out, by day">
        <Legend items={[["Received (incl. GST)", C[0]], ["Day-to-day costs + game fees", C[1]]]} />
        <Daily daily={d.daily} />
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span>In <b className="text-foreground tabular-nums">{formatIndianFull(d.kpi.received)}</b></span>
          <span>Out, all costs <b className="text-foreground tabular-nums">{formatIndianFull(d.totals.out)}</b></span>
          <span>Net of GST <b className="text-foreground tabular-nums">{formatIndianFull(net)}</b></span>
          <span>Monthly bills (rent, salaries…) <b className="text-foreground tabular-nums">{formatIndianFull(d.totals.monthlyBills)}</b></span>
        </div>
        <p className="text-[11px] text-muted-foreground">Monthly bills count in profit but aren&apos;t drawn as daily bars, so one rent day doesn&apos;t flatten the rest.</p>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="How we got to profit">
          <Waterfall w={d.waterfall} />
          <p className="text-[11px] text-muted-foreground">
            Food sold ({formatIndianFull(d.totals.foodIn)}) minus paid to the food partner ({formatIndianFull(d.totals.foodOut)}) — food isn&apos;t counted as revenue.
          </p>
        </Card>
        <Card title="GST collected so far">
          <p className="font-heading text-3xl font-bold tabular-nums">{formatIndianFull(d.kpi.gst)}</p>
          <Stack items={[["18% on play", d.gst.play], ["5% on food & cake", d.gst.food]]} />
          <p className="text-[11px] text-muted-foreground">Collected from customers and paid to the government — not revenue or profit.</p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="Where costs go">
          <Stack items={top(d.costs)} />
        </Card>
        <Card title="How customers paid">
          <Stack items={top(d.methods)} />
        </Card>
        <Card title="Bookings by type">
          <Stack items={top(d.sources.map(([k, v]) => [SOURCE[k] ?? k, v]))} format={(v) => `${v}`} />
        </Card>
      </div>

      <Card title="Games played">
        <Legend items={[["Anvio", C[0]], ["HeroZone", C[2]]]} />
        <Games games={d.games} prev={d.compare.prevGames} />
        {d.untracked > 0 && (
          <p className="text-xs text-amber-400">
            {`${d.untracked} checked-in booking${d.untracked === 1 ? "" : "s"} without games ticked — their platform fees aren't counted yet.`}
          </p>
        )}
      </Card>
    </>
  );
}

const pct = (a: number, b: number) => (b ? Math.round(((a - b) / Math.abs(b)) * 100) : null);

// Biggest four, the rest folded into "Other" so colours stay distinct.
function top(items: (readonly [string, number])[]): [string, number][] {
  const sorted = [...items].sort((a, b) => b[1] - a[1]);
  const rest = sorted.slice(4).reduce((s, x) => s + x[1], 0);
  return [...sorted.slice(0, 4).map(([k, v]) => [k, v] as [string, number]), ...(rest ? [["Other", rest] as [string, number]] : [])];
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass-card p-4 sm:p-5 space-y-3">
      <h3 className="font-heading text-sm font-bold">{title}</h3>
      {children}
    </section>
  );
}

function Tile({ label, value, sub, delta, vs, tone, children }: {
  label: string; value: string; sub: string; delta?: number | null; vs?: string; tone?: string; children?: React.ReactNode;
}) {
  return (
    <div className="glass-card p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tabular-nums" style={tone ? { color: tone } : undefined}>{value}</p>
      <p className="text-[11px] text-muted-foreground">
        {sub}
        {delta != null && (
          <span className="ml-1 font-semibold" style={{ color: delta >= 0 ? GOOD : "#ff8a8a" }}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% <span className="font-normal text-muted-foreground">{vs}</span>
          </span>
        )}
      </p>
      {children}
    </div>
  );
}

function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      {items.map(([l, c]) => (
        <span key={l} className="flex items-center gap-1.5">
          <i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: c }} />
          {l}
        </span>
      ))}
    </div>
  );
}

function Spark({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * 100},${24 - (v / max) * 22}`).join(" ");
  return (
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="w-full h-6 mt-1" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={C[0]} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// Received above the line, costs below, one column per day; hover for the day.
function Daily({ daily }: { daily: Overview["daily"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720, H = 220, mid = 130, colW = W / daily.length;
  const maxIn = Math.max(1, ...daily.map((x) => x.in));
  const maxOut = Math.max(1, ...daily.map((x) => x.out));
  const up = (v: number) => (v / maxIn) * (mid - 14);
  const down = (v: number) => (v / maxOut) * (H - mid - 22);
  const h = hover == null ? null : daily[hover];
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto text-[10px]" role="img" aria-label="Daily money received above the line and money spent below it">
        <line x1="0" x2={W} y1={mid} y2={mid} stroke="currentColor" strokeOpacity="0.2" />
        {daily.map((x, i) => {
          const bw = Math.max(2, colW - 4), cx = i * colW + 2;
          return (
            <g key={x.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={i * colW} y="0" width={colW} height={H} fill={hover === i ? "rgb(255 255 255 / 0.05)" : "transparent"} />
              {x.in > 0 && <rect x={cx} y={mid - up(x.in)} width={bw} height={up(x.in)} rx="2" fill={C[0]} />}
              {x.out > 0 && <rect x={cx} y={mid + 1} width={bw} height={down(x.out)} rx="2" fill={C[1]} />}
              {(i === 0 || (i + 1) % 5 === 0) && (
                <text x={cx + bw / 2} y={H - 4} textAnchor="middle" fill="currentColor" opacity="0.6">{i + 1}</text>
              )}
            </g>
          );
        })}
      </svg>
      {h && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md border border-white/10 bg-card px-2 py-1 text-xs whitespace-nowrap"
          style={{ left: `${((hover! + 0.5) / daily.length) * 100}%` }}
        >
          <b>{format(new Date(`${h.date}T00:00:00`), "EEE d MMM")}</b>
          <br />In {formatIndianFull(h.in)} · Out {formatIndianFull(h.out)}
          <br />Net {formatIndianFull(h.in - h.gst - h.out)} · GST {formatIndianFull(h.gst)}
        </div>
      )}
    </div>
  );
}

function Waterfall({ w }: { w: Overview["waterfall"] }) {
  const steps: [string, number, string][] = [
    ["Ticket revenue", w.tickets, C[0]],
    ["+ Food margin", w.foodMargin, C[2]],
    ["− Game fees", -w.fees, C[1]],
    ["− Expenses", -w.expenses, C[1]],
  ];
  const scale = Math.max(1, w.tickets + Math.max(0, w.foodMargin));
  let run = 0;
  return (
    <div className="space-y-2 text-xs">
      {steps.map(([label, v, color]) => {
        const from = run;
        run += v;
        const left = Math.max(0, Math.min(from, run)), width = Math.abs(v);
        return (
          <div key={label} className="grid grid-cols-[110px_1fr_80px] items-center gap-2">
            <span>{label}</span>
            <span className="relative h-4 rounded bg-white/5">
              <span className="absolute inset-y-0 rounded" style={{ left: `${(left / scale) * 100}%`, width: `${(width / scale) * 100}%`, background: color }} />
            </span>
            <b className="text-right tabular-nums">{formatIndianCompact(v)}</b>
          </div>
        );
      })}
      <div className="grid grid-cols-[110px_1fr_80px] items-center gap-2 border-t border-white/10 pt-2 font-bold">
        <span>Profit</span>
        <span className="relative h-4 rounded bg-white/5">
          <span className="absolute inset-y-0 left-0 rounded" style={{ width: `${(Math.max(0, w.profit) / scale) * 100}%`, background: GOOD }} />
        </span>
        <b className="text-right tabular-nums">{formatIndianCompact(w.profit)}</b>
      </div>
    </div>
  );
}

function Stack({ items, format: fmt = formatIndianFull }: { items: [string, number][]; format?: (v: number) => string }) {
  const total = items.reduce((s, x) => s + x[1], 0);
  if (!total) return <p className="text-xs text-muted-foreground">Nothing yet this month.</p>;
  return (
    <div className="space-y-2">
      <div className="flex gap-0.5 h-4" role="img" aria-label={items.map(([l, v]) => `${l} ${Math.round((v / total) * 100)}%`).join(", ")}>
        {items.map(([l, v], i) => (
          <span key={l} className="first:rounded-l last:rounded-r min-w-[3px]" style={{ flex: v, background: C[i] }} />
        ))}
      </div>
      <ul className="space-y-1 text-xs">
        {items.map(([l, v], i) => (
          <li key={l} className="flex items-center gap-2">
            <i className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: C[i] }} />
            <span className="flex-1 min-w-0 truncate">{l}</span>
            <span className="text-muted-foreground w-9 text-right">{Math.round((v / total) * 100)}%</span>
            <b className="tabular-nums w-20 text-right">{fmt(v)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Games({ games, prev }: { games: Overview["games"]; prev: { id: string; plays: number }[] }) {
  if (!games.length) return <p className="text-xs text-muted-foreground">No games ticked at check-in yet this month.</p>;
  const max = Math.max(...games.map((g) => g.plays));
  return (
    <div className="space-y-2 text-xs">
      {games.map((g) => {
        const before = prev.find((p) => p.id === g.id)?.plays ?? 0;
        const change = pct(g.plays, before);
        return (
          <div key={g.id} className="grid grid-cols-[minmax(90px,160px)_1fr_auto] items-center gap-2">
            <span className="truncate">{g.title}</span>
            <span className="h-3 rounded bg-white/5 overflow-hidden">
              <span className="block h-full rounded-r" style={{ width: `${(g.plays / max) * 100}%`, background: g.platform === "Anvio" ? C[0] : C[2] }} />
            </span>
            <span className="tabular-nums text-right w-44">
              {g.plays} plays · fee {formatIndianCompact(g.fee)}
              {change != null && (
                <span className="ml-1" style={{ color: change >= 0 ? GOOD : "#ff8a8a" }}>
                  {change >= 0 ? "▲" : "▼"}
                  {Math.abs(change)}%
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { DailyAggregate } from "@/lib/revenue-config";
import { formatIndianCompact } from "@/lib/revenue-config";

interface RevenueChartProps {
  data: DailyAggregate[];
  dailyBreakEven: number; // Cost / (30 days), rupees; drawn as a reference line.
  height?: number;
}

type ViewMode = "daily" | "cumulative";

// Small inline SVG chart — no external dep, stays legible from 7 to 365 days.
// Daily view is a stacked bar (bookings + walk-ins). Cumulative view is a
// single line showing rolling revenue vs a per-day break-even guideline.
export function RevenueChart({ data, dailyBreakEven, height = 220 }: RevenueChartProps) {
  const [view, setView] = useState<ViewMode>("daily");

  const width = 720;
  const padL = 46;
  const padR = 12;
  const padT = 12;
  const padB = 24;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const cumulative = useMemo(() => {
    let running = 0;
    return data.map((d) => {
      running += d.totalRevenue;
      return { date: d.date, value: running };
    });
  }, [data]);

  const maxDaily = Math.max(dailyBreakEven, ...data.map((d) => d.totalRevenue), 1);
  const maxCumulative = Math.max(cumulative[cumulative.length - 1]?.value ?? 0, 1);
  const maxY = view === "daily" ? maxDaily * 1.15 : maxCumulative * 1.05;

  const xFor = (i: number) => {
    if (data.length <= 1) return padL + innerW / 2;
    return padL + (i * innerW) / (data.length - 1);
  };
  const yFor = (v: number) => padT + innerH - (v / maxY) * innerH;

  // Bar width: fit N bars edge-to-edge with a small gap; cap so weekly views
  // don't render absurdly-thick bars.
  const barSlot = data.length > 0 ? innerW / data.length : 0;
  const barW = Math.max(1, Math.min(barSlot - 2, 24));

  const gridLines = 4;
  const yTicks = Array.from({ length: gridLines + 1 }, (_, i) => (maxY * i) / gridLines);

  // X labels: show at most ~7 tick labels regardless of range so long
  // windows stay readable without overlapping text.
  const xLabelStep = Math.max(1, Math.ceil(data.length / 7));

  const cumulativePath = useMemo(() => {
    if (cumulative.length === 0) return "";
    return cumulative
      .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p.value)}`)
      .join(" ");
    // xFor / yFor depend on data/height/maxY captured at render, not stateful.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cumulative, maxY]);

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Revenue timeline</h4>
        <div className="flex gap-1">
          <button
            onClick={() => setView("daily")}
            className={`px-2 py-1 text-[11px] rounded ${
              view === "daily"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setView("cumulative")}
            className={`px-2 py-1 text-[11px] rounded ${
              view === "cumulative"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Cumulative
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          style={{ minWidth: Math.max(width, data.length * 6) }}
          role="img"
          aria-label="Revenue over time"
        >
          {/* Grid lines + Y axis labels */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line
                x1={padL}
                x2={width - padR}
                y1={yFor(t)}
                y2={yFor(t)}
                stroke="currentColor"
                strokeOpacity={i === 0 ? 0.3 : 0.08}
                strokeWidth={1}
              />
              <text
                x={padL - 6}
                y={yFor(t) + 3}
                textAnchor="end"
                fontSize={9}
                fill="currentColor"
                opacity={0.55}
              >
                {formatIndianCompact(Math.round(t))}
              </text>
            </g>
          ))}

          {/* Break-even reference (daily view only) */}
          {view === "daily" && dailyBreakEven > 0 && (
            <g>
              <line
                x1={padL}
                x2={width - padR}
                y1={yFor(dailyBreakEven)}
                y2={yFor(dailyBreakEven)}
                stroke="#f59e0b"
                strokeOpacity={0.6}
                strokeDasharray="4 3"
                strokeWidth={1}
              />
              <text
                x={width - padR}
                y={yFor(dailyBreakEven) - 4}
                textAnchor="end"
                fontSize={9}
                fill="#f59e0b"
              >
                daily break-even
              </text>
            </g>
          )}

          {/* Bars — stacked bookings (violet) + walk-ins (green) */}
          {view === "daily" &&
            data.map((d, i) => {
              const x = xFor(i) - barW / 2;
              const bookingH = (d.bookingRevenue / maxY) * innerH;
              const walkinH = (d.walkinRevenue / maxY) * innerH;
              const bookingY = padT + innerH - bookingH;
              const walkinY = bookingY - walkinH;
              return (
                <g key={d.date}>
                  {d.bookingRevenue > 0 && (
                    <rect
                      x={x}
                      y={bookingY}
                      width={barW}
                      height={bookingH}
                      fill="#6C3BFF"
                      opacity={0.85}
                    />
                  )}
                  {d.walkinRevenue > 0 && (
                    <rect
                      x={x}
                      y={walkinY}
                      width={barW}
                      height={walkinH}
                      fill="#22c55e"
                      opacity={0.85}
                    />
                  )}
                  <title>{`${d.date}\nBookings: ${formatIndianCompact(d.bookingRevenue)} (${d.bookingSessions} sessions, ${d.bookingPlayers} players)\nWalk-ins: ${formatIndianCompact(d.walkinRevenue)} (${d.walkinSessions} sessions, ${d.walkinPlayers} players)`}</title>
                </g>
              );
            })}

          {/* Cumulative line */}
          {view === "cumulative" && (
            <>
              <path
                d={cumulativePath}
                fill="none"
                stroke="#6C3BFF"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {cumulative.map((p, i) => (
                <circle
                  key={p.date}
                  cx={xFor(i)}
                  cy={yFor(p.value)}
                  r={2}
                  fill="#6C3BFF"
                >
                  <title>{`${p.date}: cumulative ${formatIndianCompact(p.value)}`}</title>
                </circle>
              ))}
            </>
          )}

          {/* X labels */}
          {data.map((d, i) => {
            if (i % xLabelStep !== 0 && i !== data.length - 1) return null;
            return (
              <text
                key={d.date}
                x={xFor(i)}
                y={height - 6}
                textAnchor="middle"
                fontSize={9}
                fill="currentColor"
                opacity={0.55}
              >
                {d.date.slice(5)}
              </text>
            );
          })}
        </svg>
      </div>

      {view === "daily" && (
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#6C3BFF" }} />
            Bookings
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#22c55e" }} />
            Walk-ins
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 border-t border-dashed" style={{ borderColor: "#f59e0b" }} />
            Break-even
          </span>
        </div>
      )}
    </div>
  );
}

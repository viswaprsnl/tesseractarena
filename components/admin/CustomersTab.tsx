"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { withGST } from "@/lib/booking-config";
import type { Customer } from "@/lib/booking-types";

// Everyone we've captured — bookings from every channel, waivers and
// callback requests — merged per person. Search + CSV export for follow-ups.
export function CustomersTab({ pin }: { pin: string }) {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch(`/api/admin/customers?pin=${encodeURIComponent(pin)}`)
      .then(async (r) => {
        const d = await r.json();
        if (r.ok) setCustomers(d.customers);
        else setError(d.error || "Failed to load customers");
      })
      .catch(() => setError("Failed to load customers"));
  }, [pin]);

  if (error) return <p className="text-center text-sm text-destructive">{error}</p>;
  if (!customers) return <Loader2 className="animate-spin text-primary mx-auto" size={28} />;

  const q = query.trim().toLowerCase();
  const shown = q
    ? customers.filter((c) => `${c.name} ${c.phone} ${c.email}`.toLowerCase().includes(q))
    : customers;

  const exportCsv = () => {
    const header = ["Name", "Phone", "Email", "Visits", "Upcoming", "Spent (incl GST)", "Last visit", "Sources", "Waiver", "Enquiries"];
    const cell = (v: string | number | boolean) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = shown.map((c) =>
      [c.name, c.phone, c.email, c.visits, c.upcoming, withGST(c.spent), c.lastVisit, c.sources.join(" "), c.waiver ? "yes" : "no", c.enquiries]
        .map(cell)
        .join(",")
    );
    const url = URL.createObjectURL(new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "customers.csv" });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
        <div className="relative sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone or email"
            className="pl-8 bg-card/60 border-white/10 text-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{shown.length} people</span>
          <Button onClick={exportCsv} variant="outline" className="border-white/20 text-xs">
            <Download size={14} className="mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground text-left">
            <tr className="border-b border-white/10">
              <th className="p-3 font-medium">Customer</th>
              <th className="p-3 font-medium">Visits</th>
              <th className="p-3 font-medium">Spent</th>
              <th className="p-3 font-medium">Last visit</th>
              <th className="p-3 font-medium">Came via</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => (
              <tr key={`${c.phone}|${c.email}`} className="border-b border-white/5 align-top">
                <td className="p-3">
                  <p className="font-medium text-sm">{c.name || "—"}</p>
                  <p className="text-muted-foreground">{c.phone}</p>
                  {c.email && <p className="text-muted-foreground">{c.email}</p>}
                </td>
                <td className="p-3 tabular-nums">
                  {c.visits}
                  {c.upcoming > 0 && <span className="text-primary"> +{c.upcoming} upcoming</span>}
                </td>
                <td className="p-3 tabular-nums">₹{withGST(c.spent).toLocaleString("en-IN")}</td>
                <td className="p-3">{c.lastVisit || "—"}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {c.sources.map((s) => (
                      <Badge key={s} className="bg-secondary text-muted-foreground text-[10px] capitalize">{s}</Badge>
                    ))}
                    {c.waiver && <Badge className="bg-green-500/20 text-green-400 text-[10px]">Waiver ✓</Badge>}
                    {c.enquiries > 0 && <Badge className="bg-amber-500/20 text-amber-400 text-[10px]">Callback</Badge>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

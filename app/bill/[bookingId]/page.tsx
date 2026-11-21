import { notFound } from "next/navigation";
import { allGames } from "@/data/games";
import { findBookingById } from "@/lib/google-sheets";
import { getDetails } from "@/lib/details-sheets";
import { getOps, getPricing } from "@/lib/settings-sheets";
import { verifyBill } from "@/lib/bill";
import { formatTimeDisplay, gstOn, inclGst } from "@/lib/booking-config";
import { eventBill, FOOD_MENU } from "@/lib/ops-config";
import { PrintButton } from "./PrintButton";

// GST invoice for a completed booking, opened from the link sent on
// WhatsApp / email. Signed link only (see lib/bill.ts); rendered from the
// booking each time, so it always matches the sheet.
export const metadata = { title: "Bill · Tesseract Arena", robots: { index: false } };

interface PageProps {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ t?: string }>;
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function BillPage({ params, searchParams }: PageProps) {
  const { bookingId } = await params;
  const { t = "" } = await searchParams;
  if (!verifyBill(bookingId, t)) notFound();
  const hit = await findBookingById(bookingId);
  const d = await getDetails(bookingId);
  if (!hit || hit.booking.status !== "completed") notFound();
  const b = hit.booking;

  // [description, qty, ex-GST amount, GST %]
  let lines: [string, number, number, number][];
  if (d.kind) {
    const [ops, pricing] = await Promise.all([getOps(), getPricing()]);
    const bill = eventBill(b.partySize, d, ops, pricing);
    lines = [
      [d.kind === "birthday" ? "Birthday party · VR play per kid" : "Corporate event · VR play per person", b.partySize, bill.play, 18],
      ...(d.food ?? []).map((id): [string, number, number, number] => [FOOD_MENU.find((m) => m.id === id)!.label, d.eaters ?? 0, (d.eaters ?? 0) * ops.food[id], 5]),
      ...(bill.cake ? [["Branded custom cake", 1, bill.cake, 5] as [string, number, number, number]] : []),
      ...(d.custom ?? []).map((c): [string, number, number, number] => [c.name, c.qty, c.qty * c.price, c.gst]),
    ];
  } else {
    const game = allGames.find((g) => g.id === b.gamePreference)?.title ?? "VR session";
    lines = [[`${game} · per player`, b.partySize, b.amount, 18]];
  }
  const tax = (rate: number) => {
    const base = lines.filter((l) => l[3] === rate).reduce((s, l) => s + l[2], 0);
    return { base, gst: rate === 18 && !d.kind ? b.gstAmount || gstOn(b.amount) : Math.round((base * rate) / 100) };
  };
  const slabs = [18, 5].map((r) => ({ rate: r, ...tax(r) })).filter((x) => x.base > 0);
  const total = b.amount + slabs.reduce((s, x) => s + x.gst, 0);
  const gstin = process.env.BUSINESS_GSTIN;

  return (
    <div className="min-h-screen bg-white text-black px-4 py-8 print:p-0">
      <article className="mx-auto max-w-2xl space-y-6 text-sm">
        <header className="flex flex-wrap justify-between gap-4 border-b border-black/20 pb-4">
          <div>
            <h1 className="text-xl font-bold">Tesseract Arena</h1>
            <p>Preston Prime Mall, Lumbini Avenue, Gachibowli, Hyderabad 500032</p>
            {gstin && <p>GSTIN {gstin}</p>}
          </div>
          <div className="text-right">
            <p className="font-semibold">Tax invoice</p>
            <p>{d.invoiceNo}</p>
            <p>{d.completedAt ? new Date(d.completedAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) : b.date}</p>
          </div>
        </header>

        <section>
          <p className="font-semibold">Billed to</p>
          <p>{d.company || b.name}</p>
          {d.company && <p>Attn: {b.name}</p>}
          {d.gstin && <p>GSTIN {d.gstin}</p>}
          <p>{b.phone}</p>
          <p className="mt-1 text-black/60">
            Booking {b.bookingId} · {b.date} · {formatTimeDisplay(b.timeSlot)}
          </p>
        </section>

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-black/20 text-left">
              <th className="py-1">Item</th>
              <th className="py-1 text-right">Qty</th>
              <th className="py-1 text-right">GST</th>
              <th className="py-1 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map(([name, qty, amount, rate], i) => (
              <tr key={i} className="border-b border-black/10">
                <td className="py-1">{name}</td>
                <td className="py-1 text-right">{qty}</td>
                <td className="py-1 text-right">{rate}%</td>
                <td className="py-1 text-right tabular-nums">{inr(amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto max-w-xs grid grid-cols-[1fr_auto] gap-y-1 tabular-nums">
          <dt>Taxable value</dt>
          <dd className="text-right">{inr(b.amount)}</dd>
          {slabs.map((x) => (
            <div key={x.rate} className="contents">
              <dt>CGST {x.rate / 2}%</dt>
              <dd className="text-right">{inr(x.gst / 2)}</dd>
              <dt>SGST {x.rate / 2}%</dt>
              <dd className="text-right">{inr(x.gst / 2)}</dd>
            </div>
          ))}
          <dt className="font-bold border-t border-black/20 pt-1">Total</dt>
          <dd className="font-bold border-t border-black/20 pt-1 text-right">{inr(total)}</dd>
          <dt>Paid</dt>
          <dd className="text-right">{inr(inclGst(b, b.amountPaid))}</dd>
        </dl>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-black/20 pt-4 text-black/60">
          <p>Thanks for playing at Tesseract Arena!</p>
          <PrintButton />
        </footer>
      </article>
    </div>
  );
}

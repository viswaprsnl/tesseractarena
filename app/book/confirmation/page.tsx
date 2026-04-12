"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  CalendarDays,
  Clock,
  Shield,
  Users,
  CreditCard,
  CalendarPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

function ConfirmationContent() {
  const params = useSearchParams();
  const bookingId = params.get("id") || "—";
  const amount = params.get("amount") || "0";
  const date = params.get("date") || "—";
  const time = params.get("time") || "—";
  const players = params.get("players") || "—";
  const pkg = params.get("package") || "—";
  const payment = params.get("payment") || "pending";

  const isPaid = payment === "paid";
  const isPayAtCenter = payment === "pay_at_center";

  // Google Calendar link
  const calendarUrl = date !== "—" && time !== "—"
    ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Tesseract+Arena+VR+Session&dates=${date.replace(/-/g, "")}/${date.replace(/-/g, "")}&details=Booking+ID:+${bookingId}%0APlayers:+${players}%0APackage:+${pkg}&location=Block+3,+Flat+1202,+My+Home+Tarkshya,+Kokapet,+Hyderabad`
    : "#";

  return (
    <div className="pt-24 pb-16 px-4 min-h-screen flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-card p-8 sm:p-12 text-center max-w-md w-full"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <CheckCircle2 size={72} className="mx-auto mb-6 text-primary" />
        </motion.div>

        <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
        <p className="text-muted-foreground text-sm mb-6">
          {isPaid
            ? "Payment received. You're all set!"
            : isPayAtCenter
            ? "Your slot is reserved. Pay when you arrive."
            : "Your booking is being processed."}
        </p>

        {/* Booking ID */}
        <div className="bg-primary/10 rounded-lg py-3 px-6 inline-block mb-6">
          <p className="text-xs text-muted-foreground mb-1">Booking ID</p>
          <p className="font-heading text-xl font-bold tracking-wider text-primary">
            {bookingId}
          </p>
        </div>

        {/* Details */}
        <div className="space-y-3 text-sm mb-8 text-left">
          <div className="flex items-center gap-3">
            <CalendarDays size={16} className="text-primary shrink-0" />
            <span>{date}</span>
          </div>
          <div className="flex items-center gap-3">
            <Clock size={16} className="text-primary shrink-0" />
            <span>{time}</span>
          </div>
          <div className="flex items-center gap-3">
            <Users size={16} className="text-primary shrink-0" />
            <span>
              {players} player{players !== "1" ? "s" : ""} · {pkg}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <CreditCard size={16} className="text-primary shrink-0" />
            <span>
              ₹{parseInt(amount).toLocaleString("en-IN")} ·{" "}
              {isPaid ? "Paid online" : isPayAtCenter ? "Pay at center" : "Pending"}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href={`/waiver?booking=${bookingId}`}
            className={cn(
              buttonVariants(),
              "bg-primary hover:bg-primary/90 text-primary-foreground w-full justify-center inline-flex items-center gap-2"
            )}
          >
            <Shield size={16} />
            Sign Safety Waiver
          </Link>
          <a
            href={calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "border-white/20 hover:bg-white/5 w-full justify-center inline-flex items-center gap-2"
            )}
          >
            <CalendarPlus size={16} />
            Add to Google Calendar
          </a>
          <Link
            href="/book"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "border-white/20 hover:bg-white/5 w-full justify-center"
            )}
          >
            Book Another Session
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Back to Home
          </Link>
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          A confirmation email has been sent to your inbox.
        </p>
      </motion.div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-24 pb-16 px-4 min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}

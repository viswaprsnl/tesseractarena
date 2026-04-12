"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { format, addDays } from "date-fns";
import {
  Shield,
  Calendar,
  Users,
  IndianRupee,
  XCircle,
  CheckCircle2,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatTimeDisplay } from "@/lib/booking-config";
import type { BookingRow } from "@/lib/booking-types";

interface Stats {
  total: number;
  active: number;
  cancelled: number;
  paid: number;
  payAtCenter: number;
  totalRevenue: number;
}

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [waiverCheck, setWaiverCheck] = useState<Record<string, boolean | null>>({});

  const checkAllWaivers = useCallback(async (bookingList: BookingRow[]) => {
    const emails = [...new Set(bookingList.filter(b => b.status !== "cancelled").map(b => b.email))];
    const results: Record<string, boolean | null> = {};
    await Promise.all(
      emails.map(async (email) => {
        try {
          const res = await fetch(`/api/waiver?email=${encodeURIComponent(email)}`);
          const data = await res.json();
          results[email] = data.signed;
        } catch {
          results[email] = null;
        }
      })
    );
    setWaiverCheck(results);
  }, []);

  const fetchBookings = useCallback(
    async (date: string, authPin: string) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/admin/bookings?date=${date}&pin=${authPin}`
        );
        const data = await res.json();
        if (data.error) {
          setError(data.error);
          if (res.status === 401) setAuthenticated(false);
        } else {
          setBookings(data.bookings);
          setStats(data.stats);
          checkAllWaivers(data.bookings);
        }
      } catch {
        setError("Failed to fetch bookings");
      }
      setLoading(false);
    },
    [checkAllWaivers]
  );

  const handleLogin = async () => {
    setAuthenticated(true);
    fetchBookings(selectedDate, pin);
  };

  const handleDateChange = (offset: number) => {
    const newDate = format(
      addDays(new Date(selectedDate + "T00:00:00"), offset),
      "yyyy-MM-dd"
    );
    setSelectedDate(newDate);
    fetchBookings(newDate, pin);
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm(`Cancel booking ${bookingId}? This will free up the slot and notify the customer.`)) return;

    setCancelling(bookingId);
    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchBookings(selectedDate, pin);
      } else {
        setError(data.error || "Failed to cancel");
      }
    } catch {
      setError("Failed to cancel booking");
    }
    setCancelling(null);
  };

  if (!authenticated) {
    return (
      <div className="pt-24 pb-16 px-4 min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 sm:p-10 max-w-sm w-full text-center"
        >
          <Shield size={40} className="mx-auto mb-4 text-primary" />
          <h1 className="text-xl font-bold mb-2">Staff Login</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Enter admin PIN to access bookings
          </p>
          <Input
            type="password"
            placeholder="Enter PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="bg-card/60 border-white/10 text-center text-lg tracking-widest mb-4"
          />
          {error && (
            <p className="text-xs text-destructive mb-4">{error}</p>
          )}
          <Button
            onClick={handleLogin}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Login
          </Button>
        </motion.div>
      </div>
    );
  }

  const activeBookings = bookings.filter((b) => b.status !== "cancelled");
  const cancelledBookings = bookings.filter((b) => b.status === "cancelled");

  return (
    <div className="pt-20 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">
            <span className="gradient-text">Admin Panel</span>
          </h1>
          <Button
            variant="outline"
            onClick={() => {
              setAuthenticated(false);
              setPin("");
            }}
            className="border-white/20 text-sm"
          >
            Logout
          </Button>
        </div>

        {/* Date navigation */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={() => handleDateChange(-1)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                fetchBookings(e.target.value, pin);
              }}
              className="bg-transparent border-none text-center font-heading text-lg tracking-wider cursor-pointer"
            />
          </div>
          <button
            onClick={() => handleDateChange(1)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="glass-card p-4 text-center">
              <Calendar size={18} className="mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
            <div className="glass-card p-4 text-center">
              <Users size={18} className="mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">
                {activeBookings.reduce((s, b) => s + b.partySize, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Players</p>
            </div>
            <div className="glass-card p-4 text-center">
              <IndianRupee size={18} className="mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">
                ₹{stats.totalRevenue.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-muted-foreground">Revenue</p>
            </div>
            <div className="glass-card p-4 text-center">
              <CheckCircle2 size={18} className="mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.paid}</p>
              <p className="text-xs text-muted-foreground">Paid Online</p>
            </div>
          </div>
        )}

        {error && (
          <div className="glass-card p-4 mb-6 border-destructive/30 text-sm text-destructive text-center">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : (
          <>
            {/* Active bookings */}
            {activeBookings.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <Calendar size={32} className="mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground">
                  No bookings for this date
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeBookings.map((booking) => (
                  <div
                    key={booking.bookingId}
                    className="glass-card p-4 sm:p-5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-heading text-sm font-bold text-primary">
                            {booking.bookingId}
                          </span>
                          <Badge
                            className={
                              booking.paymentStatus === "paid"
                                ? "bg-green-500/20 text-green-400 text-[10px]"
                                : "bg-amber-500/20 text-amber-400 text-[10px]"
                            }
                          >
                            {booking.paymentStatus === "paid"
                              ? "Paid"
                              : "Pay at Center"}
                          </Badge>
                          {/* Waiver status */}
                          {waiverCheck[booking.email] === undefined ? (
                            <Badge className="bg-muted/30 text-muted-foreground text-[10px]">
                              Checking...
                            </Badge>
                          ) : waiverCheck[booking.email] ? (
                            <Badge className="bg-green-500/20 text-green-400 text-[10px]">
                              Waiver ✓
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/20 text-red-400 text-[10px]">
                              No Waiver ✕
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium">{booking.name}</p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {formatTimeDisplay(booking.timeSlot)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={11} />
                            {booking.partySize} players
                          </span>
                          <span>
                            {booking.package} · ₹
                            {booking.amount.toLocaleString("en-IN")}
                          </span>
                          <span>{booking.phone}</span>
                        </div>
                        {booking.gamePreference && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Game: {booking.gamePreference}
                          </p>
                        )}
                        {booking.specialRequests && (
                          <p className="text-xs text-amber-400/80 mt-1 flex items-center gap-1">
                            <AlertTriangle size={10} />
                            {booking.specialRequests}
                          </p>
                        )}
                      </div>

                      <Button
                        onClick={() => handleCancel(booking.bookingId)}
                        disabled={cancelling === booking.bookingId}
                        variant="outline"
                        className="border-destructive/30 text-destructive hover:bg-destructive/10 text-xs shrink-0"
                      >
                        {cancelling === booking.bookingId ? (
                          <Loader2 size={14} className="animate-spin mr-1" />
                        ) : (
                          <XCircle size={14} className="mr-1" />
                        )}
                        Cancel
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cancelled bookings */}
            {cancelledBookings.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm text-muted-foreground mb-3">
                  Cancelled ({cancelledBookings.length})
                </h3>
                <div className="space-y-2">
                  {cancelledBookings.map((booking) => (
                    <div
                      key={booking.bookingId}
                      className="glass-card p-3 opacity-50"
                    >
                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-heading text-muted-foreground line-through">
                          {booking.bookingId}
                        </span>
                        <span>{booking.name}</span>
                        <span>{formatTimeDisplay(booking.timeSlot)}</span>
                        <Badge className="bg-red-500/20 text-red-400 text-[10px]">
                          Cancelled
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

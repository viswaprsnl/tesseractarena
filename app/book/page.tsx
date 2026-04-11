"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarDays, Users, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fadeInUp, staggerContainer } from "@/lib/animations";

const bookingSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  date: z.string().min(1, "Please select a date"),
  time: z.string().min(1, "Please select a time"),
  partySize: z.string().min(1, "Please select party size"),
  package: z.string().min(1, "Please select a package"),
  message: z.string().optional(),
});

type BookingForm = z.infer<typeof bookingSchema>;

const timeSlots = [
  "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM",
  "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM",
  "8:00 PM", "9:00 PM",
];

export default function BookPage() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
  });

  const onSubmit = () => {
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="pt-24 pb-16 px-4 min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12 text-center max-w-md"
        >
          <CheckCircle2 size={64} className="mx-auto mb-6 text-primary" />
          <h2 className="text-2xl font-bold mb-3">Booking Confirmed!</h2>
          <p className="text-muted-foreground text-sm mb-6">
            We&apos;ve received your booking request. Check your email for
            confirmation details. See you at the arena!
          </p>
          <Button
            onClick={() => setSubmitted(false)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Book Another Session
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="gradient-text">Book Your Session</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Reserve your VR experience at Tesseract Arena. Fill out the form
              below and we&apos;ll confirm your booking.
            </p>
          </motion.div>

          <motion.form
            variants={fadeInUp}
            onSubmit={handleSubmit(onSubmit)}
            className="glass-card p-8 space-y-6"
          >
            {/* Personal Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  className="bg-card/60 border-white/10"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  className="bg-card/60 border-white/10"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(510) 555-0199"
                className="bg-card/60 border-white/10"
                {...register("phone")}
              />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone.message}</p>
              )}
            </div>

            {/* Booking Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                  <CalendarDays size={14} className="text-primary" />
                  Preferred Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  className="bg-card/60 border-white/10"
                  {...register("date")}
                />
                {errors.date && (
                  <p className="text-xs text-destructive">{errors.date.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="flex items-center gap-2">
                  <Clock size={14} className="text-primary" />
                  Preferred Time
                </Label>
                <select
                  id="time"
                  className="w-full h-9 rounded-md bg-card/60 border border-white/10 px-3 text-sm"
                  {...register("time")}
                >
                  <option value="">Select a time</option>
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
                {errors.time && (
                  <p className="text-xs text-destructive">{errors.time.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="partySize" className="flex items-center gap-2">
                  <Users size={14} className="text-primary" />
                  Party Size
                </Label>
                <select
                  id="partySize"
                  className="w-full h-9 rounded-md bg-card/60 border border-white/10 px-3 text-sm"
                  {...register("partySize")}
                >
                  <option value="">How many players?</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "player" : "players"}
                    </option>
                  ))}
                </select>
                {errors.partySize && (
                  <p className="text-xs text-destructive">
                    {errors.partySize.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="package">Package</Label>
                <select
                  id="package"
                  className="w-full h-9 rounded-md bg-card/60 border border-white/10 px-3 text-sm"
                  {...register("package")}
                >
                  <option value="">Select a package</option>
                  <option value="solo">Solo — $35/person</option>
                  <option value="squad">Squad — $30/person</option>
                  <option value="party">Party — $25/person</option>
                </select>
                {errors.package && (
                  <p className="text-xs text-destructive">
                    {errors.package.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Special Requests (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Birthday party, team building, accessibility needs, etc."
                className="bg-card/60 border-white/10 min-h-[80px]"
                {...register("message")}
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground glow-violet"
            >
              Confirm Booking
            </Button>
          </motion.form>
        </motion.div>
      </div>
    </div>
  );
}

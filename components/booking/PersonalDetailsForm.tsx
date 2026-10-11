"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// gamePreference lives in the wizard state now (picked in the Package step)
// and is injected in the wizard's handleDetailsSubmit — this form only owns
// the contact fields.
const detailsSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  specialRequests: z.string().optional(),
});

type DetailsForm = z.infer<typeof detailsSchema>;

interface PersonalDetailsFormProps {
  // Submit now takes the Turnstile token too so the wizard can
  // forward it to /api/bookings. undefined is only ever passed in
  // local dev where NEXT_PUBLIC_TURNSTILE_SITEKEY isn't set, OR on
  // kiosk flows where the widget is intentionally skipped.
  onSubmit: (data: DetailsForm, turnstileToken: string | undefined) => void;
  initialValues?: DetailsForm | null;
  // Drives the submit-button copy on step 4. When the admin's no-
  // advance toggle is on, "Continue to Payment" is misleading
  // because the next step isn't collecting any money — it's just a
  // final confirmation. Swap to "Continue to Review" in that case.
  advanceRequired?: boolean;
  // Kiosk / counter walk-in flow. The widget is skipped entirely
  // because the counter tablet + customer phones all share one
  // arena WiFi IP — Cloudflare would start challenging that IP after
  // a few bookings in a row and gum up the walk-in UX. Server also
  // skips Turnstile verify for isKiosk requests; the per-contact
  // quota + physical staff presence are the mitigations there.
  isKiosk?: boolean;
}

// Cloudflare Turnstile sitekey — only present when the admin has
// configured the integration. When undefined (local dev without env
// vars), the widget doesn't render and submit works unguarded; the
// server still rejects with 403 if TURNSTILE_SECRET is set but the
// token is missing, so a tampered client can't skip the check.
const TURNSTILE_SITEKEY = process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY;

export function PersonalDetailsForm({
  onSubmit,
  initialValues,
  advanceRequired = true,
  isKiosk = false,
}: PersonalDetailsFormProps) {
  // Turnstile is only used in the public online flow. Kiosk walk-ins
  // skip it (see comment on isKiosk prop above).
  const useTurnstile = !isKiosk && !!TURNSTILE_SITEKEY;
  // Turnstile token lives in local state because it's short-lived
  // (Cloudflare tokens expire after a few minutes); storing it in
  // the wizard reducer would risk a stale token being sent to the
  // API. The widget's onSuccess updates this; onExpire clears it so
  // the submit button disables correctly.
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DetailsForm>({
    resolver: zodResolver(detailsSchema),
    defaultValues: initialValues || { phone: "+91 " },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto"
    >
      <h3 className="font-heading text-lg font-bold text-center mb-6">
        Your Details
      </h3>

      <form
        onSubmit={handleSubmit((data) => onSubmit(data, turnstileToken))}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="Rahul Sharma"
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
              placeholder="rahul@example.com"
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
            placeholder="+91 98765 43210"
            className="bg-card/60 border-white/10"
            {...register("phone")}
          />
          {errors.phone && (
            <p className="text-xs text-destructive">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="requests">Special Requests (Optional)</Label>
          <Textarea
            id="requests"
            placeholder="Birthday party, accessibility needs, etc."
            className="bg-card/60 border-white/10 min-h-[70px]"
            {...register("specialRequests")}
          />
        </div>

        {/* Turnstile — only renders when a sitekey is configured
            AND this isn't a kiosk flow (walk-ins skip the check,
            see useTurnstile comment above). Mode "managed" lets
            Cloudflare pick between an invisible challenge and an
            interactive tap based on their heuristics. theme=dark
            matches the booking page's dark surface. */}
        {useTurnstile && TURNSTILE_SITEKEY && (
          <div className="flex items-center justify-center pt-1">
            <Turnstile
              ref={turnstileRef}
              siteKey={TURNSTILE_SITEKEY}
              options={{ theme: "dark", size: "flexible" }}
              onSuccess={(token) => setTurnstileToken(token)}
              onExpire={() => setTurnstileToken(undefined)}
              onError={() => setTurnstileToken(undefined)}
            />
          </div>
        )}

        <Button
          type="submit"
          // Disable submit until Turnstile has issued a token. Kiosk
          // flows and local dev (no sitekey configured) skip this
          // gate so the form works without a Cloudflare round-trip.
          disabled={useTurnstile && !turnstileToken}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {advanceRequired ? "Continue to Payment" : "Continue to Review"}
        </Button>
      </form>
    </motion.div>
  );
}

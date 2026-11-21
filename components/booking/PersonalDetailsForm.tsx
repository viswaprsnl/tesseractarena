"use client";

import { useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  detailsErrors,
  TURNSTILE_SITEKEY,
  type Details,
  type DetailsField as Field,
} from "./details-schema";

interface PersonalDetailsFormProps {
  values: Details;
  onChange: (values: Details) => void;
  // Set once the customer has tried to pay — reveals every outstanding
  // error, not just the fields they've already left.
  showAllErrors: boolean;
  // Kiosk walk-ins skip Turnstile: every phone at the counter shares the
  // arena's WiFi IP and Cloudflare would start challenging it.
  isKiosk?: boolean;
  onTurnstileToken: (token: string | undefined) => void;
}

export function PersonalDetailsForm({
  values,
  onChange,
  showAllErrors,
  isKiosk = false,
  onTurnstileToken,
}: PersonalDetailsFormProps) {
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const errors = detailsErrors(values);
  const errorFor = (f: Field) => (showAllErrors || touched[f] ? errors[f] : undefined);

  const bind = (f: Field) => ({
    id: `booking-${f}`,
    name: f,
    value: values[f] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...values, [f]: e.target.value }),
    onBlur: () => setTouched((t) => ({ ...t, [f]: true })),
    "aria-invalid": !!errorFor(f),
    "aria-describedby": errorFor(f) ? `booking-${f}-error` : undefined,
  });

  const fieldError = (f: Field) =>
    errorFor(f) ? (
      <p id={`booking-${f}-error`} className="text-xs text-destructive">
        {errorFor(f)}
      </p>
    ) : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="booking-name">Full name</Label>
          <Input
            placeholder="Rahul Sharma"
            autoComplete="name"
            className="bg-card/60 border-white/10"
            {...bind("name")}
          />
          {fieldError("name")}
        </div>
        <div className="space-y-2">
          <Label htmlFor="booking-phone">Phone (WhatsApp)</Label>
          <Input
            type="tel"
            placeholder="+91 98765 43210"
            autoComplete="tel"
            inputMode="tel"
            className="bg-card/60 border-white/10"
            {...bind("phone")}
          />
          {fieldError("phone")}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="booking-email">Email</Label>
        <Input
          type="email"
          placeholder="rahul@example.com"
          autoComplete="email"
          inputMode="email"
          className="bg-card/60 border-white/10"
          {...bind("email")}
        />
        {fieldError("email")}
        <p className="text-[11px] text-muted-foreground">Your confirmation and cancel link go here.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="booking-specialRequests">
          Anything we should know? <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          placeholder="Birthday surprise, first-timers, accessibility needs…"
          className="bg-card/60 border-white/10 min-h-[70px]"
          {...bind("specialRequests")}
        />
      </div>

      {!isKiosk && TURNSTILE_SITEKEY && (
        <div className="flex items-center justify-center pt-1">
          <Turnstile
            siteKey={TURNSTILE_SITEKEY}
            options={{ theme: "dark", size: "flexible" }}
            onSuccess={(token) => onTurnstileToken(token)}
            onExpire={() => onTurnstileToken(undefined)}
            onError={() => onTurnstileToken(undefined)}
          />
        </div>
      )}
    </div>
  );
}

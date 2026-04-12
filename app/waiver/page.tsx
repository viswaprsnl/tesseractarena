"use client";

import { Suspense, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CheckCircle2,
  Shield,
  ChevronDown,
  ChevronUp,
  Search,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { waiverSections } from "@/data/waiver";
import { fadeInUp } from "@/lib/animations";

const waiverFormSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(10, "Valid phone number required"),
  age: z.string().min(1, "Age is required"),
  emergencyContact: z.string().min(2, "Emergency contact name required"),
  emergencyPhone: z.string().min(10, "Emergency contact phone required"),
  isGuardian: z.boolean(),
  minorName: z.string().optional(),
  minorAge: z.string().optional(),
  mediaConsent: z.boolean(),
  signature: z.string().min(2, "Please type your full name as signature"),
});

type WaiverForm = z.infer<typeof waiverFormSchema>;

function WaiverContent() {
  const params = useSearchParams();
  const bookingId = params.get("booking") || "";
  const prefillEmail = params.get("email") || "";

  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [expandedSections, setExpandedSections] = useState<number[]>([0]);
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupResult, setLookupResult] = useState<null | {
    signed: boolean;
    waivers: { name: string; signedAt: string }[];
  }>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [mode, setMode] = useState<"form" | "lookup">(
    bookingId || prefillEmail ? "form" : "form"
  );

  const formRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<WaiverForm>({
    resolver: zodResolver(waiverFormSchema),
    defaultValues: {
      email: prefillEmail,
      isGuardian: false,
      mediaConsent: true,
      phone: "+91 ",
      emergencyPhone: "+91 ",
    },
  });

  const isGuardian = watch("isGuardian");

  const toggleSection = (index: number) => {
    setExpandedSections((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  };

  const handleLookup = async () => {
    if (!lookupEmail) return;
    setLookupLoading(true);
    try {
      const res = await fetch(
        `/api/waiver?email=${encodeURIComponent(lookupEmail)}`
      );
      const data = await res.json();
      setLookupResult(data);
    } catch {
      setLookupResult({ signed: false, waivers: [] });
    }
    setLookupLoading(false);
  };

  const onSubmit = async (data: WaiverForm) => {
    setSending(true);
    try {
      const res = await fetch("/api/waiver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          age: parseInt(data.age),
          emergencyContact: data.emergencyContact,
          emergencyPhone: data.emergencyPhone,
          isGuardian: data.isGuardian,
          minorName: data.minorName || undefined,
          minorAge: data.minorAge ? parseInt(data.minorAge) : undefined,
          mediaConsent: data.mediaConsent,
          signature: data.signature,
          bookingId: bookingId || undefined,
        }),
      });

      const result = await res.json();
      if (result.success) {
        setSubmitted(true);
      }
    } catch {
      // Handle error
    }
    setSending(false);
  };

  if (submitted) {
    return (
      <div className="pt-24 pb-16 px-4 min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-10 sm:p-12 text-center max-w-md"
        >
          <CheckCircle2 size={64} className="mx-auto mb-6 text-primary" />
          <h2 className="text-2xl font-bold mb-3">Waiver Signed!</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Thank you for completing the waiver. You&apos;re all set for your
            VR experience!
          </p>
          <div className="flex flex-col gap-3">
            {bookingId && (
              <Link
                href={`/book/confirmation?id=${bookingId}`}
                className={cn(
                  buttonVariants(),
                  "w-full justify-center bg-primary hover:bg-primary/90 text-primary-foreground"
                )}
              >
                View Booking
              </Link>
            )}
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "w-full justify-center border-white/20 hover:bg-white/5"
              )}
            >
              Back to Home
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
          <div className="text-center mb-8">
            <Shield size={40} className="mx-auto mb-4 text-primary" />
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              <span className="gradient-text">Safety Waiver</span>
            </h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Please read and sign the waiver before your VR session. You can do
              this online now or at the center.
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex justify-center gap-3 mb-8">
            <button
              onClick={() => setMode("form")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "form"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign Waiver
            </button>
            <button
              onClick={() => setMode("lookup")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "lookup"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              Check Status
            </button>
          </div>

          {/* Lookup mode */}
          {mode === "lookup" && (
            <div className="glass-card p-6 sm:p-8 mb-8">
              <h3 className="font-heading text-base font-bold mb-4">
                Already signed? Check your status
              </h3>
              <div className="flex gap-3">
                <Input
                  placeholder="Enter your email"
                  value={lookupEmail}
                  onChange={(e) => setLookupEmail(e.target.value)}
                  className="bg-card/60 border-white/10"
                  onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                />
                <Button
                  onClick={handleLookup}
                  disabled={lookupLoading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
                >
                  {lookupLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Search size={16} />
                  )}
                </Button>
              </div>

              {lookupResult && (
                <div className="mt-4">
                  {lookupResult.signed ? (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <CheckCircle2
                        size={20}
                        className="text-primary shrink-0 mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-medium">Waiver signed!</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Signed by {lookupResult.waivers[0]?.name} on{" "}
                          {lookupResult.waivers[0]?.signedAt
                            ? new Date(
                                lookupResult.waivers[0].signedAt
                              ).toLocaleDateString("en-IN")
                            : "record found"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <p className="text-sm">
                        No waiver found for this email.{" "}
                        <button
                          onClick={() => setMode("form")}
                          className="text-primary underline"
                        >
                          Sign now
                        </button>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Waiver form */}
          {mode === "form" && (
            <div ref={formRef}>
              {/* Waiver terms */}
              <div className="space-y-2 mb-8">
                {waiverSections.map((section, i) => (
                  <div
                    key={i}
                    className="glass-card overflow-hidden"
                  >
                    <button
                      onClick={() => toggleSection(i)}
                      className="w-full px-5 py-4 flex items-center justify-between text-left"
                    >
                      <span className="text-sm font-medium">
                        {section.title}
                      </span>
                      {expandedSections.includes(i) ? (
                        <ChevronUp size={16} className="text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown size={16} className="text-muted-foreground shrink-0" />
                      )}
                    </button>
                    {expandedSections.includes(i) && (
                      <div className="px-5 pb-4">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {section.content}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Form */}
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="glass-card p-6 sm:p-8 space-y-5"
              >
                <h3 className="font-heading text-base font-bold mb-2">
                  Participant Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="Rahul Sharma"
                      className="bg-card/60 border-white/10"
                      {...register("name")}
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive">
                        {errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age">Age *</Label>
                    <Input
                      id="age"
                      type="number"
                      placeholder="25"
                      className="bg-card/60 border-white/10"
                      {...register("age")}
                    />
                    {errors.age && (
                      <p className="text-xs text-destructive">
                        {errors.age.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="wemail">Email *</Label>
                    <Input
                      id="wemail"
                      type="email"
                      placeholder="rahul@example.com"
                      className="bg-card/60 border-white/10"
                      {...register("email")}
                    />
                    {errors.email && (
                      <p className="text-xs text-destructive">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wphone">Phone *</Label>
                    <Input
                      id="wphone"
                      type="tel"
                      className="bg-card/60 border-white/10"
                      {...register("phone")}
                    />
                    {errors.phone && (
                      <p className="text-xs text-destructive">
                        {errors.phone.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Emergency contact */}
                <div className="pt-4 border-t border-white/10">
                  <h4 className="text-sm font-semibold mb-3">
                    Emergency Contact
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergencyContact">Contact Name *</Label>
                      <Input
                        id="emergencyContact"
                        placeholder="Contact name"
                        className="bg-card/60 border-white/10"
                        {...register("emergencyContact")}
                      />
                      {errors.emergencyContact && (
                        <p className="text-xs text-destructive">
                          {errors.emergencyContact.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergencyPhone">Contact Phone *</Label>
                      <Input
                        id="emergencyPhone"
                        type="tel"
                        className="bg-card/60 border-white/10"
                        {...register("emergencyPhone")}
                      />
                      {errors.emergencyPhone && (
                        <p className="text-xs text-destructive">
                          {errors.emergencyPhone.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Guardian section */}
                <div className="pt-4 border-t border-white/10">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-white/20 bg-card/60 text-primary accent-primary"
                      {...register("isGuardian")}
                    />
                    <span className="text-sm">
                      I am signing on behalf of a minor (under 18)
                    </span>
                  </label>

                  {isGuardian && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="minorName">Minor&apos;s Name</Label>
                        <Input
                          id="minorName"
                          placeholder="Child's full name"
                          className="bg-card/60 border-white/10"
                          {...register("minorName")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="minorAge">Minor&apos;s Age</Label>
                        <Input
                          id="minorAge"
                          type="number"
                          placeholder="12"
                          className="bg-card/60 border-white/10"
                          {...register("minorAge")}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Media consent */}
                <div className="pt-4 border-t border-white/10">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 mt-0.5 rounded border-white/20 bg-card/60 text-primary accent-primary"
                      {...register("mediaConsent")}
                    />
                    <span className="text-sm text-muted-foreground">
                      I consent to photos/videos being taken during my visit for
                      promotional purposes (you may opt out at the center)
                    </span>
                  </label>
                </div>

                {/* Digital signature */}
                <div className="pt-4 border-t border-white/10">
                  <h4 className="text-sm font-semibold mb-1">
                    Digital Signature *
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Type your full legal name below to sign this waiver
                  </p>
                  <Input
                    placeholder="Type your full name as signature"
                    className="bg-card/60 border-white/10 font-serif italic text-lg"
                    {...register("signature")}
                  />
                  {errors.signature && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.signature.message}
                    </p>
                  )}
                </div>

                {/* Agreement */}
                <p className="text-xs text-muted-foreground leading-relaxed">
                  By signing this waiver, I acknowledge that I have read,
                  understood, and agree to all terms and conditions stated above.
                  I confirm that all information provided is accurate.
                </p>

                <Button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground glow-violet"
                >
                  {sending ? (
                    <>
                      <Loader2 size={16} className="animate-spin mr-2" />
                      Signing...
                    </>
                  ) : (
                    <>
                      <Shield size={16} className="mr-2" />
                      Sign Waiver
                    </>
                  )}
                </Button>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function WaiverPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-24 pb-16 px-4 min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <WaiverContent />
    </Suspense>
  );
}

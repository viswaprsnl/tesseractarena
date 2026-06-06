"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, X, CheckCircle2, Loader2 } from "lucide-react";

export function CallbackButton() {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("+91 ");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, name }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("done");
      } else {
        setError(data.error || "Something went wrong");
        setStatus("error");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  const reset = () => {
    setOpen(false);
    setTimeout(() => {
      setStatus("idle");
      setPhone("+91 ");
      setName("");
      setError("");
    }, 300);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:scale-105 transition-transform glow-violet"
        aria-label="Request a callback"
      >
        <Phone size={18} />
        <span className="hidden sm:inline text-sm font-medium">Call me back</span>
      </button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
            onClick={reset}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.96 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md glass-card p-8"
            >
              <button
                onClick={reset}
                className="absolute top-4 right-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              {status === "done" ? (
                <div className="text-center py-6">
                  <CheckCircle2 size={56} className="mx-auto mb-4 text-primary" />
                  <h3 className="text-xl font-bold mb-2">Got it!</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Our manager will call you back shortly. Thanks for reaching out!
                  </p>
                  <button
                    onClick={reset}
                    className="px-6 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Phone size={22} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold leading-tight">
                        Still have questions?
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Leave your number and our manager will call you back
                      </p>
                    </div>
                  </div>

                  <form onSubmit={submit} className="space-y-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">
                        Name (optional)
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className="w-full h-11 rounded-lg bg-card/60 border border-border px-3 text-sm outline-none focus:border-primary/50"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">
                        Phone *
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full h-11 rounded-lg bg-card/60 border border-border px-3 text-sm outline-none focus:border-primary/50"
                      />
                    </div>

                    {error && (
                      <p className="text-xs text-destructive">{error}</p>
                    )}

                    <button
                      type="submit"
                      disabled={status === "sending"}
                      className="w-full h-12 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors flex items-center justify-center gap-2 glow-violet disabled:opacity-60"
                    >
                      {status === "sending" ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Call me back"
                      )}
                    </button>

                    <p className="text-[11px] text-muted-foreground/70 text-center">
                      We&apos;ll only use your number to call you about your VR session.
                    </p>
                  </form>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description:
    "Cancellation windows and refund terms for Tesseract Arena bookings.",
  alternates: { canonical: "/refund" },
};

const LAST_UPDATED = "26 August 2026";

export default function RefundPage() {
  return (
    <div className="pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          <span className="gradient-text">Refund &amp; Cancellation Policy</span>
        </h1>
        <p className="text-xs text-muted-foreground mb-10">
          Last updated: {LAST_UPDATED}
        </p>

        <div className="glass-card p-6 sm:p-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <Section title="Full refund window">
            <p>You receive a full refund of your advance payment when you cancel:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                at least <strong>6 hours before</strong> a weekday session
                (Monday–Friday), or
              </li>
              <li>
                at least <strong>24 hours before</strong> a weekend session
                (Saturday or Sunday).
              </li>
            </ul>
            <p>
              The cancel page linked from your confirmation email tells you
              exactly whether your booking is still within the full-refund
              window.
            </p>
          </Section>

          <Section title="Late cancellations and no-shows">
            <p>
              Cancellations made after the above windows, and no-shows, are
              non-refundable. The slot cannot be resold at that point and the
              staff time reserved for you cannot be recovered.
            </p>
            <p>
              If you cancel late but still want to visit us, we will do our
              best to move you to a later open slot on the same day at no
              extra advance charge — subject to availability and staff
              discretion.
            </p>
          </Section>

          <Section title="How to cancel">
            <p>Two ways, whichever suits you:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                Click the cancel link in your confirmation email. It opens a
                page that confirms your slot and refund status before you
                cancel.
              </li>
              <li>
                Call{" "}
                <a className="text-primary" href="tel:+918925666211">
                  +91 89256 66211
                </a>{" "}
                during our operating hours (11:00–22:00 weekdays, 10:00–22:00
                weekends). Have your booking id (TA-XXXXXX) ready.
              </li>
            </ul>
          </Section>

          <Section title="How refunds are processed">
            <p>
              Refunds are issued to the original payment method through
              Razorpay. In our system the refund is initiated within one
              business day of your cancellation. Razorpay typically credits the
              amount back to your account within 5–7 business days, depending
              on your bank or UPI provider. The final leg is outside our
              control.
            </p>
          </Section>

          <Section title="If we cancel">
            <p>
              If we have to cancel a session for any reason on our side —
              equipment issue, power failure, illness on the team — you get a
              full refund of the advance <em>and</em>, at your choice, a free
              rescheduled slot within 30 days.
            </p>
          </Section>

          <Section title="Partial-play situations">
            <p>
              If a session is cut short after it has begun due to a fault on
              our side, we will pro-rate the refund based on the time you did
              not get to play. If a session is cut short because a player is
              behaving unsafely, no refund is due for the remainder.
            </p>
          </Section>

          <Section title="Questions">
            <p>
              Anything unclear? Email{" "}
              <a className="text-primary" href="mailto:admin@tesseractarena.com">
                admin@tesseractarena.com
              </a>{" "}
              with your booking id and we&apos;ll get back to you within one
              business day.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

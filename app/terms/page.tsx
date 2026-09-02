import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms that govern your use of the Tesseract Arena website and arena.",
  alternates: { canonical: "/terms" },
};

const LAST_UPDATED = "26 August 2026";

export default function TermsPage() {
  return (
    <div className="pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          <span className="gradient-text">Terms &amp; Conditions</span>
        </h1>
        <p className="text-xs text-muted-foreground mb-10">
          Last updated: {LAST_UPDATED}
        </p>

        <div className="glass-card p-6 sm:p-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <Section title="1. About these terms">
            <p>
              These Terms &amp; Conditions govern your use of tesseractarena.com
              and any session you book at our arena at Preston Prime Mall,
              Lumbini Avenue, Gachibowli, Hyderabad. The service is operated by
              Tesseract Interactive Private Limited, CIN U93290TS2026PTC217586.
              By booking a session or otherwise using the site you agree to
              these terms.
            </p>
          </Section>

          <Section title="2. Booking a session">
            <p>
              A booking is confirmed only after we receive the advance payment
              online and issue a booking confirmation with a booking id
              (format: TA-XXXXXX). Session times are shown in Indian Standard
              Time. Slot availability is offered on a first-come-first-served
              basis and, once a slot is booked, it is held only for the party
              who made the booking.
            </p>
            <p>
              You are responsible for the accuracy of the details you supply,
              including party size and game preference. If your party arrives
              with more players than booked and additional slots are available
              at the counter, we will do our best to accommodate them but
              cannot guarantee it.
            </p>
          </Section>

          <Section title="3. Pricing and payment">
            <p>
              Prices are shown per player and quoted in Indian Rupees, inclusive
              of applicable taxes unless stated otherwise. A per-person advance
              is collected online at the time of booking; the remaining balance
              is due at the arena counter before your session starts. Payments
              online are handled by Razorpay Software Private Limited.
            </p>
          </Section>

          <Section title="4. Cancellation and refunds">
            <p>
              Our refund policy is published on the{" "}
              <a className="text-primary" href="/refund">
                Refund &amp; Cancellation Policy
              </a>{" "}
              page and is part of these terms.
            </p>
          </Section>

          <Section title="5. Age, health and safety">
            <p>
              Free-roam VR is a physical activity. Every player must sign our
              digital safety waiver before their first session. Players under
              14 years of age must have a waiver signed by a parent or legal
              guardian, and children under 8 are not permitted to play.
            </p>
            <p>
              You must not enter the arena or wear VR equipment if you are
              intoxicated, pregnant, prone to seizures, have recently had
              surgery, or are otherwise medically advised against VR or
              vigorous movement. Our staff may decline entry on safety grounds
              at their sole discretion.
            </p>
          </Section>

          <Section title="6. Equipment and conduct">
            <p>
              VR headsets, trackers, and controllers are entrusted to players
              for the duration of a session. Reasonable care is expected; you
              agree to reimburse Tesseract Arena for damage caused by
              negligence or intentional misuse. We reserve the right to end a
              session without refund if a player behaves in a way that
              threatens the safety of others or damages equipment.
            </p>
          </Section>

          <Section title="7. Recordings and images">
            <p>
              For safety and coaching purposes, the play area is monitored on
              CCTV. We may capture photos or short video clips of sessions for
              marketing and social media. If you would prefer not to appear in
              such content, tell the counter staff before your session starts
              and we will exclude your group.
            </p>
          </Section>

          <Section title="8. Intellectual property">
            <p>
              All content on tesseractarena.com — including the Tesseract Arena
              name, logo, page copy, images, and code — belongs to Tesseract
              Interactive Private Limited or its licensors. Game titles and
              their assets belong to their respective publishers.
            </p>
          </Section>

          <Section title="9. Liability">
            <p>
              Nothing in these terms limits any liability that cannot lawfully
              be limited under Indian law. Subject to that, our aggregate
              liability arising from or in connection with your use of the
              website or arena is limited to the amount you paid for the
              affected booking.
            </p>
          </Section>

          <Section title="10. Governing law and jurisdiction">
            <p>
              These terms are governed by the laws of India. The courts of
              Hyderabad, Telangana have exclusive jurisdiction over any
              dispute arising out of them.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>
              For questions about these terms, email{" "}
              <a className="text-primary" href="mailto:admin@tesseractarena.com">
                admin@tesseractarena.com
              </a>{" "}
              or call{" "}
              <a className="text-primary" href="tel:+919908116444">
                +91 99081 16444
              </a>
              .
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

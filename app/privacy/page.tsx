import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Tesseract Arena collects, uses, and protects your personal information.",
  alternates: { canonical: "/privacy" },
};

const LAST_UPDATED = "26 August 2026";

export default function PrivacyPage() {
  return (
    <div className="pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          <span className="gradient-text">Privacy Policy</span>
        </h1>
        <p className="text-xs text-muted-foreground mb-10">
          Last updated: {LAST_UPDATED}
        </p>

        <div className="glass-card p-6 sm:p-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <Section title="Who we are">
            <p>
              This website is operated by <strong>Tesseract Interactive
              Private Limited</strong> (CIN U93290TS2026PTC217586), a company
              incorporated in India with its registered venue at L2-05 and
              L2-06, 2nd Floor, Preston Prime Mall, Lumbini Avenue, Gachibowli,
              Hyderabad, Telangana 500032. In this policy we refer to ourselves
              as &quot;Tesseract Arena&quot;, &quot;we&quot;, or &quot;us&quot;.
            </p>
            <p>
              This policy explains what personal information we collect when you
              use tesseractarena.com or visit the arena, why we collect it, and
              the rights you have over that information under the{" "}
              <strong>Digital Personal Data Protection Act, 2023</strong>.
            </p>
          </Section>

          <Section title="Information we collect">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Booking details:</strong> name, email address, mobile
                number, party size, game preference, and session date/time —
                collected when you complete a booking on the site.
              </li>
              <li>
                <strong>Payment metadata:</strong> Razorpay order id and payment
                id. We do <strong>not</strong> receive or store your card,
                UPI VPA, or bank account details — those go directly to Razorpay
                as our regulated payment processor.
              </li>
              <li>
                <strong>Waiver acknowledgements:</strong> the safety waiver you
                sign electronically before your first session, together with the
                date and the booking it applies to.
              </li>
              <li>
                <strong>Contact form messages:</strong> anything you write to us
                through the Contact page or the callback widget.
              </li>
              <li>
                <strong>Technical logs:</strong> IP address, browser and device
                information, and standard request logs, retained for security
                and troubleshooting.
              </li>
            </ul>
          </Section>

          <Section title="How we use it">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Confirming, delivering, and following up on your session.</li>
              <li>Sending booking confirmations, cancellation notices, and receipts to your email.</li>
              <li>Verifying that a waiver is on file before you play.</li>
              <li>Responding to enquiries and callback requests.</li>
              <li>
                Complying with legal obligations, including tax and financial
                record-keeping.
              </li>
            </ul>
            <p>
              We do <strong>not</strong> sell or rent your personal information
              to third parties.
            </p>
          </Section>

          <Section title="Where your data is stored">
            <p>
              Booking, waiver, and message records are stored in Google Sheets
              hosted by Google LLC. Transactional emails are sent through Resend
              (San Francisco, USA). Payments are processed by Razorpay Software
              Private Limited (Bengaluru, India). The website is hosted on
              Vercel Inc. (San Francisco, USA). Some processors are located
              outside India; where they are, we rely on their standard
              contractual and security commitments.
            </p>
          </Section>

          <Section title="How long we keep it">
            <p>
              Booking and payment records are retained for a minimum of 8 years
              to satisfy Indian tax and accounting requirements. Waiver records
              are kept for the same period. Contact form messages are kept
              while a conversation is active and for up to 2 years afterwards.
              Technical logs are typically kept for 30 days.
            </p>
          </Section>

          <Section title="Your rights">
            <p>
              You may request a copy of the personal information we hold about
              you, ask us to correct it, or ask us to delete it (subject to the
              retention obligations above). To exercise these rights, email us
              at <a className="text-primary" href="mailto:admin@tesseractarena.com">admin@tesseractarena.com</a>{" "}
              from the same address you used to book. We will respond within
              30 days.
            </p>
          </Section>

          <Section title="Cookies">
            <p>
              We use a small number of essential cookies and local-storage keys
              to remember your theme preference and to keep your booking flow
              working across steps. We do not use third-party advertising
              cookies.
            </p>
          </Section>

          <Section title="Changes to this policy">
            <p>
              We may update this policy from time to time. The &quot;Last
              updated&quot; date at the top reflects the most recent change.
              Material changes will be highlighted on the home page for at
              least seven days.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about this policy or your data? Email{" "}
              <a className="text-primary" href="mailto:admin@tesseractarena.com">
                admin@tesseractarena.com
              </a>{" "}
              or call{" "}
              <a className="text-primary" href="tel:+918925666211">
                +91 89256 66211
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

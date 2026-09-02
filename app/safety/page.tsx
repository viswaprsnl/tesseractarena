import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Safety Guidelines",
  description:
    "What to know before your VR session at Tesseract Arena — age limits, health advisories, and arena rules.",
  alternates: { canonical: "/safety" },
};

const LAST_UPDATED = "26 August 2026";

export default function SafetyPage() {
  return (
    <div className="pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          <span className="gradient-text">Safety Guidelines</span>
        </h1>
        <p className="text-xs text-muted-foreground mb-10">
          Last updated: {LAST_UPDATED}
        </p>

        <div className="glass-card p-6 sm:p-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <Section title="Before you arrive">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                Wear comfortable clothes you can move in freely and closed-toe
                shoes. Skirts, heels, and open sandals are not permitted in the
                play area.
              </li>
              <li>
                Eat a light meal beforehand — a full stomach and vigorous VR
                movement don&apos;t mix well.
              </li>
              <li>
                Please arrive 10 minutes before your slot to complete your
                waiver, gear up, and get a quick briefing.
              </li>
              <li>
                If you wear glasses, most standard frames fit inside our
                headsets. If in doubt, our staff will help you at the counter.
              </li>
            </ul>
          </Section>

          <Section title="Age and health advisories">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Minimum age:</strong> 8 years. Players between 8 and 14
                must have a waiver signed by a parent or legal guardian and be
                accompanied by an adult in the arena.
              </li>
              <li>
                <strong>Please do not play VR if you</strong> are pregnant, have
                a history of seizures or heart conditions, are recovering from
                a recent surgery or injury, or are under the influence of
                alcohol or recreational drugs.
              </li>
              <li>
                Prone to motion sickness? Tell the counter staff. We&apos;ll
                recommend calmer titles from our library and pace your session
                differently.
              </li>
              <li>
                Stop playing immediately if you feel dizzy, nauseated,
                overheated, or disoriented. Tell a staff member — this is why
                they are in the arena during every session.
              </li>
            </ul>
          </Section>

          <Section title="Inside the arena">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                Stay within the marked play boundary. The headset will show a
                grid warning as you approach a wall or another player.
              </li>
              <li>
                No running, sudden lunging, or jumping unless a staff member
                clears the movement for the specific game.
              </li>
              <li>
                No food, drink, or chewing gum in the play area.
              </li>
              <li>
                Phones and loose objects go in the free lockers at the counter
                — nothing in your pockets during play.
              </li>
              <li>
                Follow every instruction our staff give you. They are trained
                to spot risks you may not notice from inside the headset.
              </li>
            </ul>
          </Section>

          <Section title="Equipment care">
            <p>
              Each headset and controller is sanitised between sessions and
              checked for damage. Please handle them gently, don&apos;t adjust
              straps or lenses without asking staff, and let us know at once if
              anything feels loose or wrong. Deliberate damage will be charged
              at cost.
            </p>
          </Section>

          <Section title="Waiver">
            <p>
              Every player signs a digital safety waiver before their first
              session. You can sign it from the confirmation email in advance
              or at our counter when you arrive. The waiver stays on file for
              future visits so you only need to sign it once.
            </p>
          </Section>

          <Section title="Ask us anything">
            <p>
              If you&apos;re unsure whether VR is right for you or a family
              member, call{" "}
              <a className="text-primary" href="tel:+919908116444">
                +91 99081 16444
              </a>{" "}
              or email{" "}
              <a className="text-primary" href="mailto:admin@tesseractarena.com">
                admin@tesseractarena.com
              </a>{" "}
              — we&apos;re happy to walk you through what to expect.
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

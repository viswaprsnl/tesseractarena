import { Hero } from "@/components/sections/Hero";
// ReviewsMarquee now renders as an overlay inside <Hero/>, pinned to
// the hero's bottom edge, so it's in viewport from first paint on
// both desktop and mobile. Keep the component import out of this file
// so it isn't double-rendered.
// SocialProof (the hardware-tagline strip) was replaced by the review
// marquee. Re-enable here by uncommenting both the import and the render.
// import { SocialProof } from "@/components/sections/SocialProof";
// HowItWorks ("From booking to playing in three simple steps") was
// dropped on 2026-10-04 in favour of leading with real-session footage
// right after the hero. Re-enable here by uncommenting the import +
// render if the three-step pitch becomes useful again.
// import { HowItWorks } from "@/components/sections/HowItWorks";
import { GamesLibrary } from "@/components/sections/GamesLibrary";
import { ThroughTheLens } from "@/components/sections/ThroughTheLens";
import { Features } from "@/components/sections/Features";
// Pricing section intentionally hidden for now — game prices are already
// visible in the booking flow. Re-enable by restoring the import and
// <Pricing /> render below.
// import { Pricing } from "@/components/sections/Pricing";
import { CorporateBookings } from "@/components/sections/CorporateBookings";
import { Testimonials } from "@/components/sections/Testimonials";
import { FAQ } from "@/components/sections/FAQ";
import { Location } from "@/components/sections/Location";

export default function Home() {
  return (
    <>
      <Hero />
      <ThroughTheLens />
      <GamesLibrary />
      <Features />
      {/* <Pricing /> */}
      <CorporateBookings />
      <Testimonials />
      <FAQ />
      <Location />
    </>
  );
}

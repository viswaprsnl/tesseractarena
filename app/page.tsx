import { Hero } from "@/components/sections/Hero";
import { ReviewsMarquee } from "@/components/sections/ReviewsMarquee";
// SocialProof (the hardware-tagline strip) is replaced by the real-review
// marquee right under the hero. Keeping the import out so the component
// isn't bundled; re-enable later by swapping the two renders below.
// import { SocialProof } from "@/components/sections/SocialProof";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { GamesLibrary } from "@/components/sections/GamesLibrary";
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
      <ReviewsMarquee />
      <HowItWorks />
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

import { Hero } from "@/components/sections/Hero";
import { SocialProof } from "@/components/sections/SocialProof";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { GamesLibrary } from "@/components/sections/GamesLibrary";
import { Features } from "@/components/sections/Features";
// Pricing section intentionally hidden for now — game prices are already
// visible in the booking flow. Re-enable by restoring the import and
// <Pricing /> render below.
// import { Pricing } from "@/components/sections/Pricing";
import { Testimonials } from "@/components/sections/Testimonials";
import { FAQ } from "@/components/sections/FAQ";
import { Location } from "@/components/sections/Location";

export default function Home() {
  return (
    <>
      <Hero />
      <SocialProof />
      <HowItWorks />
      <GamesLibrary />
      <Features />
      {/* <Pricing /> */}
      <Testimonials />
      <FAQ />
      <Location />
    </>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CallbackButton } from "@/components/CallbackButton";

// Wraps every page's site chrome (top nav, footer, "call me back"
// floating button) so we can suppress the whole set on a given route
// prefix without touching each component. The staff kiosk view at
// /kiosk/* is the only surface that opts out today — that tablet
// runs in kiosk mode and shouldn't expose the site header/footer.
//
// This is a pure switch: renders <Navbar/><children><Footer/> normally,
// or just <children> on kiosk paths. Rendering children in either
// branch means the layout's <main> tree stays intact — no visible
// shift between routes.

interface SiteChromeProps {
  children: React.ReactNode;
}

export function SiteChrome({ children }: SiteChromeProps) {
  const pathname = usePathname();
  const isKiosk = pathname.startsWith("/kiosk");

  if (isKiosk) {
    // Bare-body kiosk mode. Give the child the full viewport by
    // stripping the flex-1 wrapper so a page can fill the tablet.
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <CallbackButton />
    </>
  );
}

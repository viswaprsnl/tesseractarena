"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

// GA4 tag loader + SPA route-change tracker. Next.js App Router doesn't
// fire pageviews on client navigations by default, so we send a manual
// page_view on every pathname change.
//
// Two things this deliberately does NOT do:
//   - Ship on /admin or /kiosk. Those are staff surfaces; measuring them
//     just inflates session counts and hides the real customer funnel.
//   - Send on server render. The Script tags are afterInteractive, and
//     the useEffect only runs client-side.

interface GoogleAnalyticsProps {
  measurementId: string;
}

// Path prefixes that should be invisible to analytics — staff-only
// surfaces. Extend this list if we ever add another back-office route.
const EXCLUDED_PREFIXES = ["/admin", "/kiosk"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: any;

export function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  const pathname = usePathname();
  const excluded = EXCLUDED_PREFIXES.some((p) => pathname?.startsWith(p));

  useEffect(() => {
    if (excluded || !pathname || typeof window === "undefined") return;
    if (!window.gtag) return;
    window.gtag("event", "page_view", { page_path: pathname });
  }, [pathname, excluded]);

  if (excluded) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          // send_page_view: false — we fire manually on every route
          // change via the useEffect above so SPA navigations count too.
          gtag('config', '${measurementId}', { send_page_view: false });
          gtag('event', 'page_view', { page_path: window.location.pathname });
        `}
      </Script>
    </>
  );
}

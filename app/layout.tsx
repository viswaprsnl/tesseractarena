import type { Metadata } from "next";
import { Orbitron, Inter } from "next/font/google";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const SITE_URL = "https://www.tesseractarena.com";

export const metadata: Metadata = {
  // metadataBase turns relative image paths in openGraph into absolute URLs
  // that crawlers and social previews can actually fetch.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Tesseract Arena | Premium VR Arena in Hyderabad",
    template: "%s | Tesseract Arena",
  },
  description:
    "Tesseract Arena is a premium free-roam virtual reality gaming arena in Gachibowli, Hyderabad. Groups of up to 8 players, zero PC required. Book your session today.",
  keywords: [
    "VR arena",
    "virtual reality Hyderabad",
    "free-roam VR",
    "VR gaming India",
    "VR birthday party",
    "corporate team building VR",
    "Preston Prime Mall",
    "Gachibowli",
    "Tesseract Arena",
    "Tesseract Interactive",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // NOTE on OG images: images are NOT set here explicitly. Next.js's file
  // convention picks up app/opengraph-image.tsx and app/twitter-image.tsx
  // and auto-injects the correct <meta og:image> and <meta twitter:image>
  // tags. Setting `images` here would silently override the file
  // convention and break WhatsApp/FB previews again. The generator emits
  // a 1200×630 PNG — raster, so WhatsApp / Instagram / Facebook / LinkedIn
  // all render it. Replace with a real arena photo later per the note at
  // the bottom of app/opengraph-image.tsx.
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: "Tesseract Arena",
    title: "Tesseract Arena | Premium VR Arena in Hyderabad",
    description:
      "Premium free-roam VR gaming arena in Gachibowli, Hyderabad. Groups of up to 8 players. Book online.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tesseract Arena | Premium VR Arena in Hyderabad",
    description:
      "Premium free-roam VR gaming arena in Gachibowli, Hyderabad. Book your session online.",
  },
  icons: {
    icon: "/logos/favicon.svg",
  },
  category: "Entertainment",
};

// EntertainmentBusiness structured data — helps search engines and corporate
// URL classifiers understand the site as a legitimate physical business, not
// an uncategorized new domain.
const businessJsonLd = {
  "@context": "https://schema.org",
  "@type": "EntertainmentBusiness",
  "@id": `${SITE_URL}/#business`,
  name: "Tesseract Arena",
  legalName: "Tesseract Interactive Private Limited",
  description:
    "A premium free-roam virtual reality gaming arena in Gachibowli, Hyderabad.",
  url: `${SITE_URL}/`,
  telephone: "+91-99081-16444",
  email: "admin@tesseractarena.com",
  priceRange: "₹₹",
  image: `${SITE_URL}/opengraph-image`,
  address: {
    "@type": "PostalAddress",
    streetAddress:
      "L2-05 and L2-06, 2nd Floor, Preston Prime Mall, Lumbini Avenue",
    addressLocality: "Gachibowli",
    addressRegion: "Telangana",
    postalCode: "500032",
    addressCountry: "IN",
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "11:00",
      closes: "22:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Saturday", "Sunday"],
      opens: "10:00",
      closes: "22:00",
    },
  ],
  sameAs: ["https://www.instagram.com/tesseractarena/"],
};

const initThemeScript = `
(function() {
  try {
    var saved = localStorage.getItem('theme');
    var preferred = saved || 'dark';
    if (preferred === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${orbitron.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: initThemeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(businessJsonLd) }}
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <ThemeProvider>
          <SiteChrome>{children}</SiteChrome>
        </ThemeProvider>
      </body>
    </html>
  );
}

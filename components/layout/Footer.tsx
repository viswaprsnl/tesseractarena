import Link from "next/link";
import { MapPin, Phone, Mail, Clock, MessageCircle } from "lucide-react";
import { PHONE_DISPLAY, WHATSAPP_NUMBER, CONTACT_EMAIL, whatsappCorporateLink } from "@/lib/contact";

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/games", label: "Games" },
  { href: "/book", label: "Book Now" },
  { href: "/birthday", label: "Birthday Parties" },
  { href: "/about", label: "About Us" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

const gameLinks = [
  { href: "/games?tab=available", label: "Available Games" },
  { href: "/games?tab=coming_soon", label: "Coming Soon" },
  { href: "/games", label: "Full Game Library" },
];

export function Footer() {
  return (
    <footer className="bg-card/80 border-t border-primary/20">
      {/* Violet accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <span className="font-heading text-xl font-bold tracking-wider gradient-text">
              TESSERACT ARENA
            </span>
            <p className="text-sm text-muted-foreground leading-relaxed">
              India&apos;s first multi-title free-roam VR arena. Premium
              Anvio and HeroZone experiences for groups of up to 8 players.
            </p>
            <a
              href={whatsappCorporateLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 text-sm text-primary hover:bg-primary/20 transition-colors"
            >
              <MessageCircle size={16} />
              WhatsApp us
            </a>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-heading text-sm font-semibold tracking-wider uppercase mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Games */}
          <div>
            <h3 className="font-heading text-sm font-semibold tracking-wider uppercase mb-4">
              Games
            </h3>
            <ul className="space-y-2">
              {gameLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-heading text-sm font-semibold tracking-wider uppercase mb-4">
              Visit Us
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin size={16} className="mt-0.5 shrink-0 text-primary" />
                <span>Preston Prime Mall<br />Lumbini Avenue, Gachibowli<br />Hyderabad 500032</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone size={16} className="shrink-0 text-primary" />
                <a
                  href={`tel:+${WHATSAPP_NUMBER}`}
                  className="hover:text-primary transition-colors"
                >
                  {PHONE_DISPLAY}
                </a>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail size={16} className="shrink-0 text-primary" />
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="hover:text-primary transition-colors"
                >
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <Clock size={16} className="mt-0.5 shrink-0 text-primary" />
                <span>Mon-Fri: 11AM - 10PM<br />Sat-Sun: 10AM - 10PM</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-border/40 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Tesseract Arena. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center sm:justify-end">
            <Link
              href="/privacy"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Terms &amp; Conditions
            </Link>
            <Link
              href="/refund"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Refund Policy
            </Link>
            <Link
              href="/safety"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Safety
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { MapPin, Phone, Mail, Clock, Globe, MessageSquare, Share2, Rss } from "lucide-react";

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/games", label: "Games" },
  { href: "/book", label: "Book Now" },
  { href: "/about", label: "About Us" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

const gameLinks = [
  { href: "/games?tab=anvio", label: "Anvio VR Games" },
  { href: "/games?tab=synthesis", label: "Synthesis VR Games" },
  { href: "/games", label: "Full Game Library" },
];

const socialLinks = [
  { href: "#", icon: Globe, label: "Website" },
  { href: "#", icon: MessageSquare, label: "Social" },
  { href: "#", icon: Share2, label: "Share" },
  { href: "#", icon: Rss, label: "Feed" },
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
              Fremont&apos;s first multi-game standalone VR arena. Premium
              free-roam experiences for groups of up to 4 players.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="p-2 rounded-lg bg-secondary/50 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
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
                <span>123 Innovation Way<br />Fremont, CA 94538</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone size={16} className="shrink-0 text-primary" />
                <span>(510) 555-0199</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail size={16} className="shrink-0 text-primary" />
                <span>hello@tesseractarena.com</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock size={16} className="shrink-0 text-primary" />
                <span>Mon-Sun: 10AM - 10PM</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Tesseract Arena. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              href="#"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="#"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

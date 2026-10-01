"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/games", label: "Games" },
  { href: "/#corporate", label: "Corporate" },
  { href: "/birthday", label: "Birthday" },
  // Pricing link intentionally hidden — the on-page Pricing section is
  // disabled on the homepage; per-game prices live in the booking flow.
  // { href: "/#pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || mobileOpen
          ? "bg-background/80 backdrop-blur-lg border-b border-border/40"
          : "bg-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="font-heading text-lg sm:text-xl font-bold tracking-wider gradient-text">
            TESSERACT ARENA
          </span>
        </Link>

        {/* Desktop nav — while over the hero video (top of page, header
            still transparent) we use near-white text with a soft shadow
            so bright frames of the video don't wash it out. Once the
            user scrolls past and the solid header background appears,
            we drop back to the normal dim colour. */}
        <div
          className={`hidden md:flex items-center gap-8 ${
            scrolled || mobileOpen
              ? ""
              : "[&_a:not(.text-primary)]:text-white/90 [&_a]:[text-shadow:0_1px_8px_rgba(0,0,0,0.6)]"
          }`}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                pathname === link.href
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA + mobile toggle */}
        <div className="flex items-center gap-3">
          {/* Theme toggle — same contrast treatment as the nav links. */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg hover:text-primary hover:bg-secondary/50 transition-colors ${
              scrolled || mobileOpen
                ? "text-muted-foreground"
                : "text-white/90 [filter:drop-shadow(0_1px_6px_rgba(0,0,0,0.6))]"
            }`}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <Link
            href="/book"
            className={cn(
              buttonVariants({ size: "default" }),
              "hidden sm:inline-flex bg-primary hover:bg-primary/90 text-primary-foreground glow-violet"
            )}
          >
            Book Now
          </Link>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-foreground"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-background/95 backdrop-blur-lg border-b border-white/5 overflow-hidden"
          >
            <div className="px-4 py-4 flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium py-2 transition-colors hover:text-primary ${
                    pathname === link.href
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/book"
                className={cn(
                  buttonVariants({ size: "default" }),
                  "mt-2 bg-primary hover:bg-primary/90 text-primary-foreground w-full justify-center"
                )}
              >
                Book Now
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

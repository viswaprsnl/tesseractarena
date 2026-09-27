"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, Navigation, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { fadeInUp, staggerContainer } from "@/lib/animations";

const contactInfo = [
  {
    icon: MapPin,
    label: "Address",
    value: "Preston Prime Mall, Lumbini Avenue, Gachibowli, Hyderabad 500032",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+91 99081 16444",
  },
  {
    icon: Mail,
    label: "Email",
    value: "admin@tesseractarena.com",
  },
  {
    icon: Clock,
    label: "Hours",
    value: "Mon-Fri: 11AM - 10PM · Sat-Sun: 10AM - 10PM",
  },
];

const MAPS_QUERY = "Preston+Prime+Mall+Lumbini+Avenue+Gachibowli+Hyderabad+500032";
const DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${MAPS_QUERY}`;
const EMBED_URL = `https://www.google.com/maps?q=${MAPS_QUERY}&output=embed`;

export function Location() {
  const [mapLoaded, setMapLoaded] = useState(false);

  return (
    <section className="py-12 sm:py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeInUp}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Find <span className="gradient-text">Us</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Located at Preston Prime Mall, Gachibowli — easy access from
            anywhere in Hyderabad
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {/* Contact info */}
          <motion.div
            variants={fadeInUp}
            className="glass-card p-8 space-y-6"
          >
            <h3 className="font-heading text-xl font-bold mb-6">
              Visit Tesseract Arena
            </h3>

            <div className="space-y-5">
              {contactInfo.map((item) => (
                <div key={item.label} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      {item.label}
                    </p>
                    <p className="text-sm">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <a
                href={DIRECTIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants(),
                  "bg-primary hover:bg-primary/90 text-primary-foreground inline-flex items-center gap-2"
                )}
              >
                <Navigation size={16} />
                Get Directions
              </a>
              <Link
                href="/contact"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-border hover:bg-secondary/50 inline-flex items-center gap-2"
                )}
              >
                <MessageCircle size={16} />
                Contact Us
              </Link>
            </div>
          </motion.div>

          {/* Google Map — click-to-load for performance. Placeholder
              shows a real static map of the venue's neighbourhood so
              the card reads as "map" from the first paint. Live iframe
              swaps in on tap. Mirrors the /contact page treatment. */}
          <motion.div
            variants={fadeInUp}
            className="glass-card overflow-hidden min-h-[400px] relative"
          >
            {mapLoaded ? (
              <iframe
                src={EMBED_URL}
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: "400px" }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Tesseract Arena Location"
                className="absolute inset-0"
              />
            ) : (
              <button
                onClick={() => setMapLoaded(true)}
                className="absolute inset-0 w-full group cursor-pointer overflow-hidden"
                aria-label="Load interactive map"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/location-map.png"
                  alt="Map of Tesseract Arena in Gachibowli, Hyderabad"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30 group-hover:from-background/90 group-hover:via-background/50 group-hover:to-background/20 transition-colors" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-4 shadow-lg shadow-primary/40 group-hover:scale-110 transition-transform">
                    <MapPin size={28} className="text-primary-foreground" />
                  </div>
                  <p className="font-heading text-lg font-bold mb-1">
                    Preston Prime Mall
                  </p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Lumbini Avenue · Gachibowli · Hyderabad 500032
                  </p>
                </div>
                <span className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-md group-hover:bg-primary/90 transition-colors">
                  Tap to open interactive map →
                </span>
              </button>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

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
    value: "+91 89256 66211",
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

          {/* Google Map — click-to-load for performance */}
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
                className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/5 via-card/30 to-accent/5 hover:from-primary/10 hover:to-accent/10 transition-colors group cursor-pointer w-full"
              >
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center mx-auto mb-4 transition-colors">
                    <MapPin size={28} className="text-primary" />
                  </div>
                  <p className="text-sm font-medium mb-1">Click to load map</p>
                  <p className="text-xs text-muted-foreground">
                    Preston Prime Mall, Gachibowli
                  </p>
                </div>
              </button>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

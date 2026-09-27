"use client";

import { useState, type ComponentType } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Phone, Mail, Clock, CheckCircle2 } from "lucide-react";
import { InstagramIcon } from "@/components/icons/InstagramIcon";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { Button } from "@/components/ui/button";
import {
  PHONE_DISPLAY,
  WHATSAPP_NUMBER,
  CONTACT_EMAIL,
  INSTAGRAM_URL,
  INSTAGRAM_HANDLE,
  whatsappCorporateLink,
} from "@/lib/contact";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fadeInUp, staggerContainer } from "@/lib/animations";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  subject: z.string().min(2, "Please enter a subject"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactForm = z.infer<typeof contactSchema>;

const contactInfo: {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  href?: string;
  // Optional per-row branding — used for Instagram so the icon container
  // renders the actual gradient badge instead of the default primary/violet.
  iconBg?: string;
  iconColor?: string;
}[] = [
  { icon: MapPin, label: "Address", value: "Preston Prime Mall, Lumbini Avenue, Gachibowli, Hyderabad 500032" },
  { icon: Phone, label: "Phone", value: PHONE_DISPLAY, href: `tel:+${WHATSAPP_NUMBER}` },
  { icon: Mail, label: "Email", value: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` },
  {
    icon: InstagramIcon,
    label: "Instagram",
    value: INSTAGRAM_HANDLE,
    href: INSTAGRAM_URL,
    iconBg: "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600",
    iconColor: "text-white",
  },
  { icon: Clock, label: "Hours", value: "Mon-Fri: 11AM - 10PM · Sat-Sun: 10AM - 10PM" },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
  });

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const onSubmit = async (data: ContactForm) => {
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setSubmitted(true);
      } else {
        setSendError(body.error || "Something went wrong. Please try again.");
      }
    } catch {
      setSendError("Network error. Please check your connection and try again.");
    }
    setSending(false);
  };

  if (submitted) {
    return (
      <div className="pt-24 pb-16 px-4 min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12 text-center max-w-md"
        >
          <CheckCircle2 size={64} className="mx-auto mb-6 text-primary" />
          <h2 className="text-2xl font-bold mb-3">Message Sent!</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Thanks for reaching out. We&apos;ll get back to you within 24 hours.
          </p>
          <Button
            onClick={() => setSubmitted(false)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Send Another Message
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="text-center mb-12"
        >
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="gradient-text">Contact Us</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Have a question, want to plan an event, or just want to say hi?
            We&apos;d love to hear from you.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto"
        >
          {/* Contact form */}
          <motion.form
            variants={fadeInUp}
            onSubmit={handleSubmit(onSubmit)}
            className="glass-card p-8 space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                className="bg-card/60 border-white/10"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                className="bg-card/60 border-white/10"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="General inquiry, event booking, etc."
                className="bg-card/60 border-white/10"
                {...register("subject")}
              />
              {errors.subject && (
                <p className="text-xs text-destructive">{errors.subject.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Tell us what's on your mind..."
                className="bg-card/60 border-white/10 min-h-[120px]"
                {...register("message")}
              />
              {errors.message && (
                <p className="text-xs text-destructive">
                  {errors.message.message}
                </p>
              )}
            </div>
            {sendError && (
              <p className="text-xs text-destructive text-center">{sendError}</p>
            )}
            <Button
              type="submit"
              size="lg"
              disabled={sending}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {sending ? "Sending..." : "Send Message"}
            </Button>
          </motion.form>

          {/* Contact info */}
          <motion.div variants={fadeInUp} className="space-y-6">
            <div className="glass-card p-8 space-y-5">
              <h3 className="font-heading text-xl font-bold">Get In Touch</h3>
              {contactInfo.map((item) => (
                <div key={item.label} className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg ${item.iconBg || "bg-primary/10"} flex items-center justify-center shrink-0`}
                  >
                    <item.icon size={18} className={item.iconColor || "text-primary"} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      {item.label}
                    </p>
                    {item.href ? (
                      <a
                        href={item.href}
                        {...(item.href.startsWith("http")
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                        className="text-sm text-primary hover:underline"
                      >
                        {item.value}
                      </a>
                    ) : (
                      <p className="text-sm">{item.value}</p>
                    )}
                  </div>
                </div>
              ))}
              <a
                href={whatsappCorporateLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#25D366] hover:bg-[#1EBE5A] text-white text-sm font-medium transition-colors"
              >
                <WhatsAppIcon size={16} />
                Chat on WhatsApp
              </a>
            </div>

            {/* Google Map — click-to-load for performance. Placeholder
                shows a real static map of the venue's neighbourhood
                (public/images/location-map.png — fetched once from a
                free static-maps service and committed) so the card
                reads as "map" from the first paint instead of a blank
                gradient. Live iframe swaps in on tap. */}
            <div className="glass-card overflow-hidden h-[250px] relative">
              {mapLoaded ? (
                <iframe
                  src="https://www.google.com/maps?q=Preston+Prime+Mall+Lumbini+Avenue+Gachibowli+Hyderabad+500032&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
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
                  {/* Static map image as the base layer */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/location-map.png"
                    alt="Map of Tesseract Arena in Gachibowli, Hyderabad"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Dark violet overlay for legibility + theme match. Fades
                      slightly on hover so the map peeks through more. */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30 group-hover:from-background/90 group-hover:via-background/50 group-hover:to-background/20 transition-colors" />
                  {/* Centre content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                    <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center mb-3 shadow-lg shadow-primary/40 group-hover:scale-110 transition-transform">
                      <MapPin size={22} className="text-primary-foreground" />
                    </div>
                    <p className="font-heading text-base font-bold mb-0.5">
                      Preston Prime Mall
                    </p>
                    <p className="text-[11px] text-muted-foreground max-w-xs">
                      Lumbini Avenue · Gachibowli · Hyderabad 500032
                    </p>
                  </div>
                  {/* Bottom-right CTA pill */}
                  <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-medium shadow-md group-hover:bg-primary/90 transition-colors">
                    Tap to open interactive map →
                  </span>
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

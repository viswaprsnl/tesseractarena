"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Phone, Mail, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const contactInfo = [
  { icon: MapPin, label: "Address", value: "Block 3, Flat 1202, My Home Tarkshya, Golden Mile Road, Kokapet, Hyderabad 500075" },
  { icon: Phone, label: "Phone", value: "+91 89256 66211" },
  { icon: Mail, label: "Email", value: "venkattessearact@gmail.com / viswatesseract@gmail.com" },
  { icon: Clock, label: "Hours", value: "Mon-Sun: 10AM - 10PM" },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
  });

  const [sending, setSending] = useState(false);

  const onSubmit = async (data: ContactForm) => {
    setSending(true);
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: "f536358e-b849-455e-b619-c0a6a0a197aa",
          subject: `[Tesseract Arena] Contact: ${data.subject}`,
          from_name: data.name,
          email: data.email,
          message: data.message,
        }),
      });
      if (res.ok) setSubmitted(true);
    } catch {
      // fallback
      setSubmitted(true);
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

            {/* Map placeholder */}
            <div className="glass-card overflow-hidden h-[250px] relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-card to-accent/5 flex items-center justify-center">
                <div className="text-center">
                  <MapPin size={36} className="mx-auto mb-3 text-primary/40" />
                  <p className="text-xs text-muted-foreground">
                    Interactive Map Placeholder
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

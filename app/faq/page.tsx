"use client";

import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqItems } from "@/data/faq";
import { fadeInUp, staggerContainer } from "@/lib/animations";

export default function FAQPage() {
  return (
    <div className="pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="text-center mb-12"
        >
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="gradient-text">FAQ</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Everything you need to know about Tesseract Arena. Can&apos;t find
            your answer?{" "}
            <a href="/contact" className="text-primary hover:underline">
              Contact us
            </a>
            .
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <Accordion className="space-y-3">
            {faqItems.map((item, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <AccordionItem
                  value={`item-${i}`}
                  className="glass-card px-6 border-white/10 data-[state=open]:border-primary/30"
                >
                  <AccordionTrigger className="text-left text-sm sm:text-base font-medium hover:text-primary py-5">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </div>
  );
}

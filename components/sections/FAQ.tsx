"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqItems, FAQ_CATEGORIES, type FAQCategory } from "@/data/faq";
import { fadeInUp, staggerContainer } from "@/lib/animations";

// One pill per category — the "All" pill was dropped because 10
// questions in a flat list defeats the point of the filter. The
// first category is pre-selected so the section is never empty.
type FilterId = FAQCategory;

export function FAQ() {
  const [filter, setFilter] = useState<FilterId>(FAQ_CATEGORIES[0].id);

  // Precompute per-category counts so the pills can show them. Memo
  // because faqItems is static but we're re-rendering on filter
  // change — doing the reduce in render would recount every click.
  const counts = useMemo(() => {
    const c: Record<FilterId, number> = {
      experience: 0,
      groups: 0,
      booking: 0,
    };
    for (const item of faqItems) c[item.category]++;
    return c;
  }, []);

  const visibleItems = useMemo(
    () => faqItems.filter((it) => it.category === filter),
    [filter]
  );

  const pills: { id: FilterId; label: string }[] = FAQ_CATEGORIES.map((c) => ({
    id: c.id,
    label: c.label,
  }));

  return (
    <section id="faq" className="py-12 sm:py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeInUp}
          className="text-center mb-10 sm:mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Frequently Asked <span className="gradient-text">Questions</span>
          </h2>
          <p className="text-muted-foreground">
            Everything you need to know before your visit
          </p>
        </motion.div>

        {/* Category filter pills. Horizontally scrollable on mobile
            so a crowded row doesn't wrap. gap-2 + px-1 padding so
            the first/last pills don't clip at the viewport edge
            inside the scroll container. "All" is default + sticky
            left so it's always reachable. */}
        <div className="mb-6 -mx-4 px-4 overflow-x-auto">
          <div className="flex items-center gap-2 w-max mx-auto pb-1">
            {pills.map((p) => {
              const active = filter === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFilter(p.id)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap border ${
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-[0_0_20px_rgba(108,59,255,0.3)]"
                      : "bg-secondary/40 border-white/10 text-muted-foreground hover:text-foreground hover:border-white/25"
                  }`}
                >
                  {p.label}
                  <span
                    className={`text-[10px] font-semibold tabular-nums ${
                      active
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground/70"
                    }`}
                  >
                    {counts[p.id]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}
          // key on filter so a category change re-plays the
          // stagger animation — makes the swap feel intentional
          // instead of just the list jumping.
          key={filter}
        >
          <Accordion className="space-y-3">
            {visibleItems.map((item, i) => (
              <motion.div key={`${filter}-${i}`} variants={fadeInUp}>
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
    </section>
  );
}

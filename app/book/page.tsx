"use client";

import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/animations";
import { BookingWizard } from "@/components/booking/BookingWizard";

export default function BookPage() {
  return (
    <div className="pt-24 pb-16 px-4">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
        className="text-center mb-10"
      >
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          <span className="gradient-text">Book Your Session</span>
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto text-sm">
          Reserve your VR experience in just a few steps
        </p>
      </motion.div>

      <BookingWizard />
    </div>
  );
}

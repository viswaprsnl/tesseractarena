"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

const steps = [
  { num: 1, label: "Date" },
  { num: 2, label: "Time" },
  { num: 3, label: "Package" },
  { num: 4, label: "Details" },
  { num: 5, label: "Payment" },
];

export function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-10">
      {steps.map((step, i) => (
        <div key={step.num} className="flex items-center">
          <div className="flex flex-col items-center">
            <motion.div
              initial={false}
              animate={{
                backgroundColor:
                  currentStep > step.num
                    ? "oklch(0.48 0.24 284)"
                    : currentStep === step.num
                    ? "oklch(0.48 0.24 284)"
                    : "oklch(0.18 0.02 264)",
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold"
            >
              {currentStep > step.num ? (
                <Check size={14} className="text-white" />
              ) : (
                <span className="text-white">{step.num}</span>
              )}
            </motion.div>
            <span className="text-[10px] sm:text-xs text-muted-foreground mt-1 hidden sm:block">
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-6 sm:w-10 h-px mx-1 transition-colors ${
                currentStep > step.num ? "bg-primary" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

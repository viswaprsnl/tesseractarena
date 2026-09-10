import type { Metadata } from "next";
import { Suspense } from "react";
import { BirthdayWizard } from "@/components/birthday/BirthdayWizard";

export const metadata: Metadata = {
  title: "Book a birthday party",
  description:
    "Reserve your VR birthday party slot at Tesseract Arena in under a minute.",
  alternates: { canonical: "/birthday/book" },
};

export default function BirthdayBookPage() {
  return (
    <Suspense fallback={null}>
      <BirthdayWizard />
    </Suspense>
  );
}

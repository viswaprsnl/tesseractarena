import type { Metadata } from "next";
import { Orbitron, Inter } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tesseract Arena | Premium VR Experience in India",
  description:
    "Step into another world at India's first multi-game standalone VR arena. Up to 10 players, zero PC required. Book your session today.",
  keywords: [
    "VR arena",
    "virtual reality",
    "India",
    "Hyderabad",
    "multiplayer VR",
    "VR experience",
    "Tesseract Arena",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${orbitron.variable} ${inter.variable}`}
    >
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

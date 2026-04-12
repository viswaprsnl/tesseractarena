"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Clock, Swords, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { Game } from "@/data/games";

interface GamePreviewModalProps {
  game: Game | null;
  videoUrl?: string;
  statusInfo?: { status: string; note: string };
  onClose: () => void;
}

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  unavailable: { label: "Unavailable", color: "bg-red-500/80 text-white" },
  coming_soon: { label: "Coming Soon", color: "bg-blue-500/80 text-white" },
  maintenance: { label: "Maintenance", color: "bg-amber-500/80 text-white" },
};

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function GamePreviewModal({
  game,
  videoUrl,
  statusInfo,
  onClose,
}: GamePreviewModalProps) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (game) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [game]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const youtubeId = videoUrl ? extractYouTubeId(videoUrl) : null;
  const isUnavailable = statusInfo && statusInfo.status !== "available";

  return (
    <AnimatePresence>
      {game && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto glass-card rounded-2xl"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            {/* Video or Image */}
            <div className="relative aspect-video bg-black rounded-t-2xl overflow-hidden">
              {youtubeId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                  className="absolute inset-0 w-full h-full"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  title={`${game.title} trailer`}
                />
              ) : (
                <div className="relative w-full h-full">
                  <Image
                    src={game.image}
                    alt={game.title}
                    fill
                    className={`object-cover ${isUnavailable ? "grayscale" : ""}`}
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur flex items-center justify-center mx-auto mb-3">
                        <Play size={28} className="text-white ml-1" />
                      </div>
                      <p className="text-sm text-white/60">
                        Trailer coming soon
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Status badge on video */}
              {isUnavailable && statusInfo && STATUS_BADGES[statusInfo.status] && (
                <div className="absolute top-4 left-4">
                  <Badge className={`text-xs ${STATUS_BADGES[statusInfo.status].color}`}>
                    {STATUS_BADGES[statusInfo.status].label}
                  </Badge>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-6 sm:p-8">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="font-heading text-xl sm:text-2xl font-bold mb-2">
                    {game.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-xs border-primary/30 text-primary"
                    >
                      {game.genre}
                    </Badge>
                    <Badge className="text-[10px] bg-secondary text-muted-foreground capitalize">
                      {game.provider === "anvio" ? "Anvio VR" : "Synthesis VR"}
                    </Badge>
                    {game.featured && (
                      <Badge className="text-[10px] bg-primary text-primary-foreground">
                        Featured
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-4 mb-5 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Users size={14} className="text-primary" />
                  {game.players} players
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={14} className="text-primary" />
                  {game.duration}
                </span>
                <span className="flex items-center gap-1.5">
                  <Swords size={14} className="text-primary" />
                  {game.difficulty}
                </span>
              </div>

              {/* Status note */}
              {isUnavailable && statusInfo?.note && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-5">
                  <p className="text-xs text-amber-400">{statusInfo.note}</p>
                </div>
              )}

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                {game.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-6">
                {game.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-3 py-1 rounded-full bg-secondary/50 text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* CTA */}
              {!isUnavailable ? (
                <Link
                  href="/book"
                  onClick={onClose}
                  className={cn(
                    buttonVariants(),
                    "w-full justify-center bg-primary hover:bg-primary/90 text-primary-foreground glow-violet text-base py-3"
                  )}
                >
                  Book This Game
                </Link>
              ) : (
                <div className="w-full text-center py-3 rounded-lg bg-muted/30 text-muted-foreground text-sm">
                  This game is currently {statusInfo?.status?.replace("_", " ")}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

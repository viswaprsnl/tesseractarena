"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Users, Clock, Swords } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { anvioGames, synthesisGames, type Game } from "@/data/games";
import { fadeInUp, staggerContainer, staggerFast } from "@/lib/animations";
import { GamePreviewModal } from "@/components/GamePreviewModal";

type GameStatusInfo = { status: string; note: string; videoUrl?: string; hidden?: boolean };

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  unavailable: { label: "Unavailable", color: "bg-red-500/80 text-white" },
  coming_soon: { label: "Coming Soon", color: "bg-blue-500/80 text-white" },
  maintenance: { label: "Maintenance", color: "bg-amber-500/80 text-white" },
};

function GameCard({ game, status, onClick }: { game: Game; status?: GameStatusInfo; onClick: () => void }) {
  const isUnavailable = status && status.status !== "available";

  return (
    <motion.div
      variants={fadeInUp}
      onClick={onClick}
      className={`glass-card overflow-hidden group transition-transform duration-300 cursor-pointer ${
        isUnavailable ? "opacity-60" : "hover:-translate-y-1"
      }`}
    >
      {/* Game thumbnail */}
      <div className="relative aspect-[16/10] bg-card overflow-hidden">
        <Image
          src={game.image}
          alt={game.title}
          fill
          className={`object-cover transition-transform duration-500 ${
            isUnavailable ? "grayscale" : "group-hover:scale-105"
          }`}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {game.featured && !isUnavailable && (
          <Badge className="absolute top-3 left-3 z-10 bg-primary text-primary-foreground text-[10px]">
            Featured
          </Badge>
        )}
        {isUnavailable && status && STATUS_BADGES[status.status] && (
          <Badge className={`absolute top-3 left-3 z-10 text-[10px] ${STATUS_BADGES[status.status].color}`}>
            {STATUS_BADGES[status.status].label}
          </Badge>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-heading text-base font-semibold leading-tight">
            {game.title}
          </h3>
        </div>

        <Badge
          variant="outline"
          className="text-[10px] border-primary/20 text-primary mb-3"
        >
          {game.genre}
        </Badge>

        {isUnavailable && status?.note && (
          <p className="text-xs text-amber-400/80 mb-2">{status.note}</p>
        )}

        <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">
          {game.description}
        </p>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users size={12} className="text-primary" />
            {game.players}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} className="text-primary" />
            {game.duration}
          </span>
          <span className="flex items-center gap-1">
            <Swords size={12} className="text-primary" />
            {game.difficulty}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export function GamesLibrary() {
  const [gameStatuses, setGameStatuses] = useState<Record<string, GameStatusInfo>>({});
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [customGames, setCustomGames] = useState<Game[]>([]);

  useEffect(() => {
    fetch("/api/admin/games")
      .then((res) => res.json())
      .then((data) => {
        if (data.statuses) setGameStatuses(data.statuses);
        if (data.customGames) {
          setCustomGames(data.customGames.map((g: Record<string, string>) => ({
            id: g.id, title: g.title, provider: g.provider as "anvio" | "synthesis",
            description: g.description, players: g.players, genre: g.genre,
            duration: g.duration, difficulty: g.difficulty, image: g.image,
            videoUrl: g.videoUrl, tags: (g.tags || "").split(",").map((t: string) => t.trim()).filter(Boolean),
          })));
        }
      })
      .catch(() => {});
  }, []);

  const visibleAnvio = [...anvioGames, ...customGames.filter(g => g.provider === "anvio")]
    .filter(g => !gameStatuses[g.id]?.hidden);
  const visibleSynthesis = [...synthesisGames, ...customGames.filter(g => g.provider === "synthesis")]
    .filter(g => !gameStatuses[g.id]?.hidden);

  return (
    <section id="games" className="py-12 sm:py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeInUp}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Our <span className="gradient-text">Games Library</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Over 20 premium VR experiences from world-class platforms
          </p>
        </motion.div>

        <Tabs defaultValue="anvio" className="w-full">
          <div className="flex justify-center mb-10">
            <TabsList className="bg-card/60 border border-white/10">
              <TabsTrigger
                value="anvio"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-heading text-xs tracking-wider"
              >
                Anvio VR
              </TabsTrigger>
              <TabsTrigger
                value="synthesis"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-heading text-xs tracking-wider"
              >
                Synthesis VR
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="anvio">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              variants={staggerFast}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {visibleAnvio.map((game) => (
                <GameCard key={game.id} game={game} status={gameStatuses[game.id]} onClick={() => setSelectedGame(game)} />
              ))}
            </motion.div>
          </TabsContent>

          <TabsContent value="synthesis">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              variants={staggerFast}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {visibleSynthesis.map((game) => (
                <GameCard key={game.id} game={game} status={gameStatuses[game.id]} onClick={() => setSelectedGame(game)} />
              ))}
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      <GamePreviewModal
        game={selectedGame}
        videoUrl={selectedGame ? (gameStatuses[selectedGame.id]?.videoUrl || selectedGame.videoUrl) : undefined}
        statusInfo={selectedGame ? gameStatuses[selectedGame.id] : undefined}
        onClose={() => setSelectedGame(null)}
      />
    </section>
  );
}

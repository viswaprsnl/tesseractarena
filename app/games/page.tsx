"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Users, Clock, Swords, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { anvioGames, synthesisGames, type Game } from "@/data/games";
import { fadeInUp, staggerFast } from "@/lib/animations";
import { GamePreviewModal } from "@/components/GamePreviewModal";

type GameStatusInfo = { status: string; note: string; videoUrl?: string };

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
      <div className="p-5">
        <h3 className="font-heading text-base font-semibold leading-tight mb-2">
          {game.title}
        </h3>
        <Badge variant="outline" className="text-[10px] border-primary/20 text-primary mb-3">
          {game.genre}
        </Badge>
        {isUnavailable && status?.note && (
          <p className="text-xs text-amber-400/80 mb-2">{status.note}</p>
        )}
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
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
        <div className="flex flex-wrap gap-1.5 mt-4">
          {game.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/50 text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function GamesPage() {
  const [search, setSearch] = useState("");
  const [gameStatuses, setGameStatuses] = useState<Record<string, GameStatusInfo>>({});
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  useEffect(() => {
    fetch("/api/admin/games")
      .then((res) => res.json())
      .then((data) => { if (data.statuses) setGameStatuses(data.statuses); })
      .catch(() => {});
  }, []);

  const filterGames = (games: Game[]) =>
    games.filter(
      (g) =>
        g.title.toLowerCase().includes(search.toLowerCase()) ||
        g.genre.toLowerCase().includes(search.toLowerCase()) ||
        g.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    );

  return (
    <div className="pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Hero banner */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="text-center mb-12"
        >
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="gradient-text">Game Library</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            Explore our full catalog of 20+ premium VR experiences from
            world-class platforms.
          </p>
          <div className="max-w-md mx-auto relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search games by title, genre, or tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card/60 border-white/10"
            />
          </div>
        </motion.div>

        <Tabs defaultValue="anvio" className="w-full">
          <div className="flex justify-center mb-10">
            <TabsList className="bg-card/60 border border-white/10">
              <TabsTrigger
                value="anvio"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-heading text-xs tracking-wider"
              >
                Anvio VR ({filterGames(anvioGames).length})
              </TabsTrigger>
              <TabsTrigger
                value="synthesis"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-heading text-xs tracking-wider"
              >
                Synthesis VR ({filterGames(synthesisGames).length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="anvio">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerFast}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filterGames(anvioGames).map((game) => (
                <GameCard key={game.id} game={game} status={gameStatuses[game.id]} onClick={() => setSelectedGame(game)} />
              ))}
            </motion.div>
          </TabsContent>

          <TabsContent value="synthesis">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerFast}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filterGames(synthesisGames).map((game) => (
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
    </div>
  );
}

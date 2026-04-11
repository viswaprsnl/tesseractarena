"use client";

import { motion } from "framer-motion";
import { Users, Clock, Swords } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { anvioGames, synthesisGames, type Game } from "@/data/games";
import { fadeInUp, staggerContainer, staggerFast } from "@/lib/animations";

function GameCard({ game }: { game: Game }) {
  return (
    <motion.div
      variants={fadeInUp}
      className="glass-card overflow-hidden group hover:-translate-y-1 transition-transform duration-300"
    >
      {/* Image placeholder */}
      <div className="relative aspect-[16/10] bg-gradient-to-br from-primary/20 via-card to-accent/10 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-heading text-sm tracking-wider text-muted-foreground/60 text-center px-4">
            {game.title}
          </span>
        </div>
        {game.featured && (
          <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground text-[10px]">
            Featured
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
  return (
    <section id="games" className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
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
              {anvioGames.map((game) => (
                <GameCard key={game.id} game={game} />
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
              {synthesisGames.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

"use client";

import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { allGames } from "@/data/games";

const detailsSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  gamePreference: z.string().min(1, "Please select a game"),
  specialRequests: z.string().optional(),
});

type DetailsForm = z.infer<typeof detailsSchema>;

interface PersonalDetailsFormProps {
  onSubmit: (data: DetailsForm) => void;
  initialValues?: DetailsForm | null;
}

export function PersonalDetailsForm({
  onSubmit,
  initialValues,
}: PersonalDetailsFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DetailsForm>({
    resolver: zodResolver(detailsSchema),
    defaultValues: initialValues || undefined,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto"
    >
      <h3 className="font-heading text-lg font-bold text-center mb-6">
        Your Details
      </h3>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="Rahul Sharma"
              className="bg-card/60 border-white/10"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="rahul@example.com"
              className="bg-card/60 border-white/10"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+91 98765 43210"
            className="bg-card/60 border-white/10"
            {...register("phone")}
          />
          {errors.phone && (
            <p className="text-xs text-destructive">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="game">Preferred Game</Label>
          <select
            id="game"
            className="w-full h-9 rounded-md bg-card/60 border border-white/10 px-3 text-sm"
            {...register("gamePreference")}
          >
            <option value="">Select a game</option>
            {allGames.map((game) => (
              <option key={game.id} value={game.id}>
                {game.title} ({game.provider === "anvio" ? "Anvio" : "Synthesis"})
              </option>
            ))}
          </select>
          {errors.gamePreference && (
            <p className="text-xs text-destructive">
              {errors.gamePreference.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="requests">Special Requests (Optional)</Label>
          <Textarea
            id="requests"
            placeholder="Birthday party, accessibility needs, etc."
            className="bg-card/60 border-white/10 min-h-[70px]"
            {...register("specialRequests")}
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Continue to Payment
        </Button>
      </form>
    </motion.div>
  );
}

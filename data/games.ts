export interface Game {
  id: string;
  title: string;
  provider: "anvio" | "synthesis";
  description: string;
  players: string;
  genre: string;
  duration: string;
  difficulty: string;
  image: string;
  featured?: boolean;
  tags: string[];
}

export const anvioGames: Game[] = [
  {
    id: "city-z",
    title: "City Z",
    provider: "anvio",
    description:
      "Full-body free-roam zombie shooter. Navigate post-apocalyptic urban environments through collapsing skyscrapers and dark subway tunnels while fighting hordes of undead.",
    players: "2-4",
    genre: "Zombie Survival",
    duration: "30 min",
    difficulty: "Medium",
    image: "/images/games/city-z.jpg",
    featured: true,
    tags: ["action", "co-op", "horror", "free-roam"],
  },
  {
    id: "city-z-survivors",
    title: "City Z: Survivors",
    provider: "anvio",
    description:
      "Escape from a skyscraper rooftop and fight your way to a secret laboratory through an army of hungry zombies. Teamwork is your only chance.",
    players: "2-4",
    genre: "Zombie Survival",
    duration: "30 min",
    difficulty: "Medium",
    image: "/images/games/city-z-survivors.jpg",
    tags: ["action", "co-op", "horror", "free-roam"],
  },
  {
    id: "city-z-antidote",
    title: "City Z: Antidote",
    provider: "anvio",
    description:
      "Scientists found a cure but it's been stolen by criminals. Face both zombies and thugs as you search for the antidote to save humanity.",
    players: "2-4",
    genre: "Zombie Survival",
    duration: "30 min",
    difficulty: "Hard",
    image: "/images/games/city-z-antidote.jpg",
    tags: ["action", "co-op", "horror", "free-roam"],
  },
  {
    id: "city-z-necropolis",
    title: "City Z: Necropolis",
    provider: "anvio",
    description:
      "A special forces team encounters an unusual device and something goes critically wrong. The darkest chapter in the City Z saga.",
    players: "2-4",
    genre: "Horror Shooter",
    duration: "30 min",
    difficulty: "Hard",
    image: "/images/games/city-z-necropolis.jpg",
    tags: ["action", "co-op", "horror", "intense"],
  },
  {
    id: "station-zarya",
    title: "Station Zarya",
    provider: "anvio",
    description:
      "Respond to a distress signal from a research base on the distant planet Regulus-5. Battle unknown alien lifeforms attacking from ground and air.",
    players: "2-4",
    genre: "Sci-Fi Shooter",
    duration: "30 min",
    difficulty: "Medium",
    image: "/images/games/station-zarya.jpg",
    featured: true,
    tags: ["sci-fi", "co-op", "action", "free-roam"],
  },
  {
    id: "revolta",
    title: "Revolta",
    provider: "anvio",
    description:
      "Team-based competitive VR shooter with Deathmatch, Team Deathmatch, and Point Capture modes. Virtual reality reinvents laser tag.",
    players: "2-4",
    genre: "PvP Shooter",
    duration: "30 min",
    difficulty: "Medium",
    image: "/images/games/revolta.jpg",
    tags: ["pvp", "competitive", "action", "multiplayer"],
  },
  {
    id: "lost-sanctuary",
    title: "Lost Sanctuary",
    provider: "anvio",
    description:
      "Explore an abandoned Aztec mystical city guided by an ancient spirit. Catch magical fireflies, shoot lightning, and sail a magical river.",
    players: "2-4",
    genre: "Fantasy Adventure",
    duration: "30 min",
    difficulty: "Easy",
    image: "/images/games/lost-sanctuary.jpg",
    tags: ["adventure", "puzzle", "family", "fantasy"],
  },
  {
    id: "dragon-vr",
    title: "Dragon VR",
    provider: "anvio",
    description:
      "Hatch a dragon egg and soar over enchanting landscapes on your pet dragon's back. Defend against T-Rex and pterodactyls along the way.",
    players: "2-4",
    genre: "Fantasy Adventure",
    duration: "30 min",
    difficulty: "Easy",
    image: "/images/games/dragon-vr.jpg",
    tags: ["adventure", "family", "fantasy", "flying"],
  },
  {
    id: "prince-of-persia",
    title: "Prince of Persia: The Dagger of Time",
    provider: "anvio",
    description:
      "A Ubisoft VR escape game set in the Prince of Persia universe. Solve time-manipulation puzzles and climb through the Fortress of Time.",
    players: "2-4",
    genre: "Escape Room",
    duration: "30 min",
    difficulty: "Medium",
    image: "/images/games/prince-of-persia.jpg",
    featured: true,
    tags: ["puzzle", "escape-room", "co-op", "adventure"],
  },
  {
    id: "punch-beat",
    title: "Punch Beat",
    provider: "anvio",
    description:
      "Rhythm-based VR game where players match colored beats to high-energy music. A perfect warm-up or cool-down experience.",
    players: "1-4",
    genre: "Rhythm",
    duration: "15 min",
    difficulty: "Easy",
    image: "/images/games/punch-beat.jpg",
    tags: ["music", "rhythm", "party", "casual"],
  },
];

export const synthesisGames: Game[] = [
  {
    id: "after-the-fall",
    title: "After The Fall",
    provider: "synthesis",
    description:
      "Award-winning post-apocalyptic co-op shooter set in frozen Los Angeles. Fight the Snowbreed with full free-roam mechanics and haptic feedback.",
    players: "2-4",
    genre: "Co-op Shooter",
    duration: "30 min",
    difficulty: "Medium",
    image: "/images/games/after-the-fall.jpg",
    featured: true,
    tags: ["action", "co-op", "shooter", "free-roam"],
  },
  {
    id: "starforce",
    title: "StarForce",
    provider: "synthesis",
    description:
      "High-intensity squad-based arcade shooter designed exclusively for VR arcades. Battle relentless alien swarms in intense co-op action.",
    players: "2-4",
    genre: "Sci-Fi Shooter",
    duration: "25 min",
    difficulty: "Medium",
    image: "/images/games/starforce.jpg",
    tags: ["sci-fi", "co-op", "action", "arcade"],
  },
  {
    id: "arizona-sunshine",
    title: "Arizona Sunshine Remake",
    provider: "synthesis",
    description:
      "Next-gen zombie survival with gory co-op action. Scalable free-roam arenas with full-body tracking. A proven VR crowd-pleaser.",
    players: "2-4",
    genre: "Zombie Shooter",
    duration: "30 min",
    difficulty: "Medium",
    image: "/images/games/arizona-sunshine.jpg",
    featured: true,
    tags: ["action", "co-op", "zombie", "free-roam"],
  },
  {
    id: "propagation",
    title: "Propagation: Top Survivors",
    provider: "synthesis",
    description:
      "VR action shooter where survivors face a zombie apocalypse and hurricane dangers in intense multiplayer combat.",
    players: "2-4",
    genre: "Survival Horror",
    duration: "25 min",
    difficulty: "Hard",
    image: "/images/games/propagation.jpg",
    tags: ["horror", "survival", "co-op", "action"],
  },
  {
    id: "riddle-of-ruins",
    title: "Riddle of Ruins",
    provider: "synthesis",
    description:
      "Explore an ancient temple, solve puzzles, uncover secrets, and hunt for treasure in this thrilling VR puzzle adventure.",
    players: "2-4",
    genre: "Puzzle Adventure",
    duration: "30 min",
    difficulty: "Medium",
    image: "/images/games/riddle-of-ruins.jpg",
    tags: ["puzzle", "adventure", "co-op", "exploration"],
  },
  {
    id: "cook-out",
    title: "Cook-Out",
    provider: "synthesis",
    description:
      "Award-winning multiplayer VR cooking game. Get your aprons ready — things are about to get messy in this chaotic kitchen party.",
    players: "2-4",
    genre: "Party Game",
    duration: "20 min",
    difficulty: "Easy",
    image: "/images/games/cook-out.jpg",
    tags: ["party", "casual", "co-op", "fun"],
  },
  {
    id: "elven-assassin",
    title: "Elven Assassin Arcade",
    provider: "synthesis",
    description:
      "Defend against hordes of orcs with your bow and arrow. Co-op archery gameplay for epic fantasy battles with friends.",
    players: "2-4",
    genre: "Action Archery",
    duration: "25 min",
    difficulty: "Easy",
    image: "/images/games/elven-assassin.jpg",
    tags: ["action", "archery", "fantasy", "co-op"],
  },
  {
    id: "dragon-slayers",
    title: "Dragon Slayers",
    provider: "synthesis",
    description:
      "Take on massive beasts together in this co-op action experience with beautiful graphics and intense dragon-fighting action.",
    players: "2-4",
    genre: "Fantasy Action",
    duration: "30 min",
    difficulty: "Medium",
    image: "/images/games/dragon-slayers.jpg",
    tags: ["fantasy", "co-op", "action", "boss-fights"],
  },
  {
    id: "smurfs",
    title: "The Smurfs: Blueberry Battle",
    provider: "synthesis",
    description:
      "Enter the Smurf world in VR! Save the Village and score points in this colorful, family-friendly shooter experience.",
    players: "1-4",
    genre: "Family Shooter",
    duration: "20 min",
    difficulty: "Easy",
    image: "/images/games/smurfs.jpg",
    tags: ["family", "casual", "fun", "kids"],
  },
  {
    id: "synth-riders",
    title: "Synth Riders",
    provider: "synthesis",
    description:
      "Freestyle dance VR rhythm game with an incredible soundtrack. Move your whole body to the beat in this neon-lit experience.",
    players: "1-2",
    genre: "Rhythm Dance",
    duration: "15 min",
    difficulty: "Easy",
    image: "/images/games/synth-riders.jpg",
    tags: ["music", "rhythm", "dance", "fitness"],
  },
  {
    id: "zero-caliber-2",
    title: "Zero Caliber 2 Remastered",
    provider: "synthesis",
    description:
      "LBVR-ready shooter with fast onboarding and flexible sessions. Features both co-op campaign and competitive PvP modes.",
    players: "2-4",
    genre: "Tactical Shooter",
    duration: "30 min",
    difficulty: "Medium",
    image: "/images/games/zero-caliber.jpg",
    tags: ["shooter", "tactical", "co-op", "pvp"],
  },
];

export const allGames: Game[] = [...anvioGames, ...synthesisGames];

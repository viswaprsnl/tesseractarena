export type GameCategory = "available" | "coming_soon";

export interface Game {
  id: string;
  title: string;
  category: GameCategory;
  description: string;
  players: string;
  genre: string;
  duration: string;
  difficulty: string;
  image: string;
  videoUrl?: string;
  featured?: boolean;
  tags: string[];
}

export const availableGames: Game[] = [
  {
    id: "city-z",
    title: "City Z",
    category: "available",
    description:
      "Full-body free-roam zombie shooter. Navigate post-apocalyptic urban environments through collapsing skyscrapers and dark subway tunnels while fighting hordes of undead.",
    players: "1-6",
    genre: "Zombie Survival",
    duration: "30 min",
    difficulty: "Medium",
    image: "https://images.worldofescapes.com/uploads/quests/22973/large/anvio-city-z.jpg",
    featured: true,
    tags: ["action", "co-op", "horror", "free-roam"],
  },
  {
    id: "station-zarya",
    title: "Station Zarya",
    category: "available",
    description:
      "Respond to a distress signal from a research base on the distant planet Regulus-5. Battle unknown alien lifeforms attacking from ground and air.",
    players: "1-6",
    genre: "Sci-Fi Shooter",
    duration: "30 min",
    difficulty: "Medium",
    image: "https://images.worldofescapes.com/uploads/quests/22974/large/anvio-station-zarya.jpg",
    featured: true,
    tags: ["sci-fi", "co-op", "action", "free-roam"],
  },
  {
    id: "revolta",
    title: "Revolta",
    category: "available",
    description:
      "A new VR PvP shooter. Three modes — Deathmatch, Team Deathmatch, Point Capture — across three themed maps (desert, factory, city center). Seven weapons, ten character skins.",
    players: "1-8",
    genre: "PvP Shooter",
    duration: "30 min",
    difficulty: "Medium",
    image: "https://static.tildacdn.com/tild3461-3235-4634-b931-616536383366/__2022-12-01__192405.png",
    featured: true,
    tags: ["pvp", "competitive", "action", "multiplayer"],
  },
  {
    id: "arrowsong-dark-omen",
    title: "Arrowsong: Dark Omen",
    category: "available",
    description:
      "Fight side by side in a thrilling VR fantasy adventure. Wield the bow, rally your fellowship, and hold the line against the forces of the Dark Lord.",
    players: "1-6",
    genre: "Fantasy Action",
    duration: "30 min",
    difficulty: "Medium",
    image: "https://cdn.prod.website-files.com/69793cc1ea9bc10fbb44d6a5/6a68b7eedb11f5e66e38e39c_Arrowsong%20-%20Dark%20Omen.png",
    tags: ["fantasy", "co-op", "archery", "free-roam"],
  },
  {
    id: "terminator-uprising",
    title: "Terminator Uprising",
    category: "available",
    description:
      "Award-winning free-roam shooter. Join the resistance and take on Skynet's machines in intense co-op combat across a devastated future battlefield.",
    players: "1-8",
    genre: "Sci-Fi Shooter",
    duration: "30 min",
    difficulty: "Medium",
    image: "https://cdn.prod.website-files.com/69793cc1ea9bc10fbb44d6a5/6a68ba7cf358cafdc3486a7e_Terminator%20poster.png",
    tags: ["sci-fi", "co-op", "action", "free-roam"],
  },
  {
    id: "monkey-madness",
    title: "Monkey Madness",
    category: "available",
    description:
      "A party VR game where you and your friends compete for the favor of the Great Monkey Emperor. Race through jungle challenges — fun for beginners and families.",
    players: "1-8",
    genre: "Party Game",
    duration: "30 min",
    difficulty: "Easy",
    image: "https://cdn.prod.website-files.com/69793cc1ea9bc10fbb44d6a5/6a4fbb05528de02514b83158_MonkeyMadness_Poster.avif",
    tags: ["party", "casual", "family", "co-op"],
  },
  {
    id: "dead-ahead",
    title: "Dead Ahead",
    category: "available",
    description:
      "Award-winning zombie defense shooter. Make a last stand with your squad against relentless waves of the undead — reload, aim, hold the perimeter.",
    players: "1-6",
    genre: "Zombie Shooter",
    duration: "30 min",
    difficulty: "Medium",
    image: "https://cdn.prod.website-files.com/69793cc1ea9bc10fbb44d6a5/6a68ba49e225a3204503ff60_Dead%20Ahead%20poster.png",
    tags: ["action", "co-op", "horror", "shooter"],
  },
  {
    id: "wayfinders",
    title: "Wayfinders",
    category: "available",
    description:
      "Cinematic sci-fi escape adventure. Navigate a deteriorating space station through interactive sequences that reward teamwork, timing, and nerve.",
    players: "1-6",
    genre: "Sci-Fi Adventure",
    duration: "30 min",
    difficulty: "Medium",
    image: "https://cdn.prod.website-files.com/69793cc1ea9bc10fbb44d6a5/6a4fbd845097819d0cd21a44_Wayfinders_Poster.avif",
    tags: ["sci-fi", "adventure", "co-op", "cinematic"],
  },
  {
    id: "cops-vs-robbers",
    title: "Cops vs Robbers",
    category: "available",
    description:
      "Action-packed PvP shooter with crawlspaces, interactive environments, and split-second tactical decisions. Pick a side — enforce the law or break it.",
    players: "1-6",
    genre: "PvP Shooter",
    duration: "30 min",
    difficulty: "Medium",
    image: "https://cdn.prod.website-files.com/69793cc1ea9bc10fbb44d6a5/6a4fbc56528de02514b935b4_HZ%20Game%20Cops%20vs%20Robbers.avif",
    tags: ["pvp", "competitive", "action", "multiplayer"],
  },
];

export const comingSoonGames: Game[] = [
  {
    id: "city-z-survivors",
    title: "City Z: Survivors",
    category: "coming_soon",
    description:
      "Escape from a skyscraper rooftop and fight your way to a secret laboratory through an army of hungry zombies. Teamwork is your only chance.",
    players: "1-6",
    genre: "Zombie Survival",
    duration: "30 min",
    difficulty: "Medium",
    image: "https://inoui-vr.fr/wp-content/uploads/2025/06/cityZ-survivors.png",
    tags: ["action", "co-op", "horror", "free-roam"],
  },
  {
    id: "city-z-antidote",
    title: "City Z: Antidote",
    category: "coming_soon",
    description:
      "Scientists found a cure but it's been stolen by criminals. Face both zombies and thugs as you search for the antidote to save humanity.",
    players: "1-4",
    genre: "Zombie Survival",
    duration: "30 min",
    difficulty: "Hard",
    image: "https://static.tildacdn.com/tild3864-3532-4465-b062-666130356135/image.png",
    tags: ["action", "co-op", "horror", "free-roam"],
  },
  {
    id: "city-z-necropolis",
    title: "City Z: Necropolis",
    category: "coming_soon",
    description:
      "A special forces team encounters an unusual device and something goes critically wrong. The darkest chapter in the City Z saga.",
    players: "1-4",
    genre: "Horror Shooter",
    duration: "30 min",
    difficulty: "Hard",
    image: "https://static.tildacdn.com/tild6563-3532-4032-b334-646135653933/image.png",
    tags: ["action", "co-op", "horror", "intense"],
  },
  {
    id: "lost-sanctuary",
    title: "Lost Sanctuary",
    category: "coming_soon",
    description:
      "Explore an abandoned Aztec mystical city guided by an ancient spirit. Catch magical fireflies, shoot lightning, and sail a magical river.",
    players: "1-6",
    genre: "Fantasy Adventure",
    duration: "30 min",
    difficulty: "Easy",
    image: "https://images.worldofescapes.com/uploads/quests/22975/large/anvio-lost-sanctuary.jpg",
    tags: ["adventure", "puzzle", "family", "fantasy"],
  },
  {
    id: "dragon-vr",
    title: "Dragon VR",
    category: "coming_soon",
    description:
      "Hatch a dragon egg and soar over enchanting landscapes on your pet dragon's back. Defend against T-Rex and pterodactyls along the way.",
    players: "1-4",
    genre: "Fantasy Adventure",
    duration: "30 min",
    difficulty: "Easy",
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1486660/header.jpg?t=1619858252",
    tags: ["adventure", "family", "fantasy", "flying"],
  },
  {
    id: "trials-of-atlantis",
    title: "Trials of Atlantis",
    category: "coming_soon",
    description:
      "Modular underwater escape room. Teams complete five unique trials that blend puzzles and action in a visually stunning sunken city.",
    players: "1-6",
    genre: "Escape Room",
    duration: "30 min",
    difficulty: "Medium",
    image: "https://cdn.prod.website-files.com/69793cc1ea9bc10fbb44d6a5/6a60d65e059c66262de183fb_ToA_Poster.jpg",
    tags: ["escape", "puzzle", "co-op", "adventure"],
  },
  {
    id: "versus",
    title: "Versus",
    category: "coming_soon",
    description:
      "Retro-futuristic PvP laser tag. Dual-wield futuristic weapons in Team Battle or Free-For-All modes on neon-lit arenas.",
    players: "2-8",
    genre: "PvP Shooter",
    duration: "30 min",
    difficulty: "Medium",
    image: "https://cdn.prod.website-files.com/69793cc1ea9bc10fbb44d6a5/6a4fbdfcfb1b2037358a6381_HZ%20Game%20Versus.avif",
    tags: ["pvp", "competitive", "action", "laser-tag"],
  },
  {
    id: "quantum-arena",
    title: "Quantum Arena",
    category: "coming_soon",
    description:
      "Intense futuristic tournament with bouncing bullets, interactive levels, and booby traps across multiple game modes.",
    players: "2-6",
    genre: "PvP Shooter",
    duration: "30 min",
    difficulty: "Medium",
    image: "https://cdn.prod.website-files.com/69793cc1ea9bc10fbb44d6a5/6a4fbb88502c96c1ab0b6ffe_HZ%20Game%20Quantum%20Arena.avif",
    tags: ["pvp", "competitive", "action", "sci-fi"],
  },
  {
    id: "wizard-academy",
    title: "Wizard Academy",
    category: "coming_soon",
    description:
      "Cooperative puzzle game where wizard students complete magical tasks and solve mysteries before time expires.",
    players: "1-8",
    genre: "Puzzle Adventure",
    duration: "30 min",
    difficulty: "Easy",
    image: "https://cdn.prod.website-files.com/69793cc1ea9bc10fbb44d6a5/6a4fbb92167da01a1eb71619_HZ%20Game%20Wizard%20Academy.avif",
    tags: ["puzzle", "family", "co-op", "fantasy"],
  },
  {
    id: "espionage-express",
    title: "Espionage Express",
    category: "coming_soon",
    description:
      "Agents escape a hacked train by solving puzzles and working together in a thrilling game of cat-and-mouse.",
    players: "1-6",
    genre: "Escape Room",
    duration: "30 min",
    difficulty: "Medium",
    image: "https://cdn.prod.website-files.com/69793cc1ea9bc10fbb44d6a5/6a4fbcbf87bdd7de8ad3ad9f_HZ%20Game%20Espionage%20Express.avif",
    tags: ["escape", "puzzle", "co-op", "family"],
  },
  {
    id: "cookd-up",
    title: "Cook'd Up",
    category: "coming_soon",
    description:
      "Family-friendly team-building game. Chefs cooperate to cook burgers and satisfy hungry customers before the kitchen falls behind.",
    players: "1-6",
    genre: "Party Game",
    duration: "30 min",
    difficulty: "Easy",
    image: "https://cdn.prod.website-files.com/69793cc1ea9bc10fbb44d6a5/6a4fbbc4230c7f32c94ab288_HZ%20Game%20Cook%E2%80%99d%20Up.avif",
    tags: ["party", "casual", "family", "team-building"],
  },
  {
    id: "plush-rush",
    title: "Plush Rush",
    category: "coming_soon",
    description:
      "Tower defense adventure. Toy-sized teams protect candy jars from mischievous enemies with arcade-grade excitement.",
    players: "1-8",
    genre: "Tower Defense",
    duration: "30 min",
    difficulty: "Easy",
    image: "https://cdn.prod.website-files.com/69793cc1ea9bc10fbb44d6a5/6a4fbd2f3031db7ec7cc4c41_Plush%20Rush_Poster.avif",
    tags: ["action", "family", "co-op", "casual"],
  },
  {
    id: "arrowsong",
    title: "Arrowsong",
    category: "coming_soon",
    description:
      "Adventurous archery game. Heroes defend the sacred tree against goblins, machines, and — inevitably — a dragon.",
    players: "1-6",
    genre: "Action Archery",
    duration: "30 min",
    difficulty: "Easy",
    image: "https://cdn.prod.website-files.com/69793cc1ea9bc10fbb44d6a5/6a4fbb69e93df905241e960c_HZ%20Game%20Arrowsong2.avif",
    tags: ["action", "archery", "family", "fantasy"],
  },
  {
    id: "cyber-shock",
    title: "Cyber Shock",
    category: "coming_soon",
    description:
      "Fast-paced futuristic shooter. Digital warriors battle viruses through neon-charged virtual combat.",
    players: "1-6",
    genre: "Sci-Fi Shooter",
    duration: "30 min",
    difficulty: "Medium",
    image: "https://cdn.prod.website-files.com/69793cc1ea9bc10fbb44d6a5/6a4fbe7b3089a6e2d584a237_HZ%20Cyber%20Shock_Poster.avif",
    tags: ["sci-fi", "action", "co-op", "shooter"],
  },
];

export const allGames: Game[] = [...availableGames, ...comingSoonGames];

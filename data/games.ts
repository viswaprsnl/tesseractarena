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
    image: "https://cdn.prod.website-files.com/69793cc1ea9bc10fbb44d6a5/6a68d8293b602d32b55cd056_Arrowsong_DarkOmen_Banner.jpg",
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
    image: "https://cdn.prod.website-files.com/69793cc1ea9bc10fbb44d6a5/698504367c959b729c2c1899_Terminator%201.jpg",
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
    image: "https://cdn.prod.website-files.com/69793cc1ea9bc10fbb44d6a5/699f4b56ffb28457e31f76ff_Monkey%20Madness%201.jpg",
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
    image: "https://cdn.prod.website-files.com/69793cc1ea9bc10fbb44d6a5/6984fd41360dd4a281a0cdfb_Dead%20Ahead%201.jpg",
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
    image: "https://cdn.prod.website-files.com/69793cc1ea9bc10fbb44d6a5/6984fd88e685edaaade37488_Wayfinders%201.jpg",
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
    image: "https://cdn.prod.website-files.com/69793cc1ea9bc10fbb44d6a5/698500597a5b0645664c748d_Cops%20vs%20Robbers%201.jpg",
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
];

export const allGames: Game[] = [...availableGames, ...comingSoonGames];

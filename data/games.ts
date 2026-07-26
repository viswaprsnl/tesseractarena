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
    id: "after-the-fall",
    title: "After The Fall",
    category: "coming_soon",
    description:
      "Award-winning post-apocalyptic co-op shooter set in frozen Los Angeles. Fight the Snowbreed with full free-roam mechanics and haptic feedback.",
    players: "2-4",
    genre: "Co-op Shooter",
    duration: "30 min",
    difficulty: "Medium",
    image: "https://cdn.synthesisvr.com/gameassets/svr_5906/compress-1.jpg",
    videoUrl: "/videos/after-the-fall.mp4",
    tags: ["action", "co-op", "shooter", "free-roam"],
  },
  {
    id: "starforce",
    title: "StarForce",
    category: "coming_soon",
    description:
      "High-intensity squad-based arcade shooter designed exclusively for VR arcades. Battle relentless alien swarms in intense co-op action.",
    players: "2-4",
    genre: "Sci-Fi Shooter",
    duration: "25 min",
    difficulty: "Medium",
    image: "https://cdn.synthesisvr.com/gameassets/svr_78776/header460x215_1739344620.webp",
    tags: ["sci-fi", "co-op", "action", "arcade"],
  },
  {
    id: "arizona-sunshine",
    title: "Arizona Sunshine Remake",
    category: "coming_soon",
    description:
      "Next-gen zombie survival with gory co-op action. Scalable free-roam arenas with full-body tracking. A proven VR crowd-pleaser.",
    players: "2-4",
    genre: "Zombie Shooter",
    duration: "30 min",
    difficulty: "Medium",
    image: "https://cdn.synthesisvr.com/gameassets/svr_78406/header460x215_1738909811.webp",
    videoUrl: "/videos/arizona-sunshine.mp4",
    tags: ["action", "co-op", "zombie", "free-roam"],
  },
  {
    id: "propagation",
    title: "Propagation: Top Survivors",
    category: "coming_soon",
    description:
      "VR action shooter where survivors face a zombie apocalypse and hurricane dangers in intense multiplayer combat.",
    players: "2-4",
    genre: "Survival Horror",
    duration: "25 min",
    difficulty: "Hard",
    image: "https://cdn.synthesisvr.com/gameassets/svr_27694/header_b1460x215_1698997964.webp",
    tags: ["horror", "survival", "co-op", "action"],
  },
  {
    id: "riddle-of-ruins",
    title: "Riddle of Ruins",
    category: "coming_soon",
    description:
      "Explore an ancient temple, solve puzzles, uncover secrets, and hunt for treasure in this thrilling VR puzzle adventure.",
    players: "2-4",
    genre: "Puzzle Adventure",
    duration: "30 min",
    difficulty: "Medium",
    image: "https://cdn.synthesisvr.com/gameassets/svr_78307/header460x215_1731422933.webp",
    videoUrl: "/videos/riddle-of-ruins.mp4",
    tags: ["puzzle", "adventure", "co-op", "exploration"],
  },
  {
    id: "cook-out",
    title: "Cook-Out",
    category: "coming_soon",
    description:
      "Award-winning multiplayer VR cooking game. Get your aprons ready — things are about to get messy in this chaotic kitchen party.",
    players: "2-4",
    genre: "Party Game",
    duration: "20 min",
    difficulty: "Easy",
    image: "https://cdn.synthesisvr.com/gameassets/svr_6208/header.webp",
    tags: ["party", "casual", "co-op", "fun"],
  },
  {
    id: "elven-assassin",
    title: "Elven Assassin Arcade",
    category: "coming_soon",
    description:
      "Defend against hordes of orcs with your bow and arrow. Co-op archery gameplay for epic fantasy battles with friends.",
    players: "2-4",
    genre: "Action Archery",
    duration: "25 min",
    difficulty: "Easy",
    image: "https://cdn.synthesisvr.com/gameassets/svr_33685/header460x215_1707213306.webp",
    tags: ["action", "archery", "fantasy", "co-op"],
  },
  {
    id: "dragon-slayers",
    title: "Dragon Slayers",
    category: "coming_soon",
    description:
      "Take on massive beasts together in this co-op action experience with beautiful graphics and intense dragon-fighting action.",
    players: "2-4",
    genre: "Fantasy Action",
    duration: "30 min",
    difficulty: "Medium",
    image: "https://cdn.synthesisvr.com/gameassets/svr_7564/header460x215_1694727655.webp",
    tags: ["fantasy", "co-op", "action", "boss-fights"],
  },
  {
    id: "smurfs",
    title: "The Smurfs: Blueberry Battle",
    category: "coming_soon",
    description:
      "Enter the Smurf world in VR! Save the Village and score points in this colorful, family-friendly shooter experience.",
    players: "1-4",
    genre: "Family Shooter",
    duration: "20 min",
    difficulty: "Easy",
    image: "https://cdn.synthesisvr.com/gameassets/svr_37837/header460x215_1727855823.webp",
    videoUrl: "/videos/smurfs.mp4",
    tags: ["family", "casual", "fun", "kids"],
  },
  {
    id: "synth-riders",
    title: "Synth Riders",
    category: "coming_soon",
    description:
      "Freestyle dance VR rhythm game with an incredible soundtrack. Move your whole body to the beat in this neon-lit experience.",
    players: "1-2",
    genre: "Rhythm Dance",
    duration: "15 min",
    difficulty: "Easy",
    image: "https://cdn.synthesisvr.com/gameassets/svr_2144/header.webp",
    tags: ["music", "rhythm", "dance", "fitness"],
  },
  {
    id: "zero-caliber-2",
    title: "Zero Caliber 2 Remastered",
    category: "coming_soon",
    description:
      "LBVR-ready shooter with fast onboarding and flexible sessions. Features both co-op campaign and competitive PvP modes.",
    players: "2-4",
    genre: "Tactical Shooter",
    duration: "30 min",
    difficulty: "Medium",
    image: "https://cdn.synthesisvr.com/gameassets/svr_79722/header460x215_1768386727.webp",
    tags: ["shooter", "tactical", "co-op", "pvp"],
  },
  {
    id: "pixel-hack",
    title: "Pixel Hack",
    category: "coming_soon",
    description:
      "Multiplayer co-op shooter blending roguelike elements with retro pixel art. Choose from 4 weapon types, unlock 100+ upgrade skills, and battle through waves of enemies.",
    players: "1-4",
    genre: "Co-op Roguelike Shooter",
    duration: "25 min",
    difficulty: "Medium",
    image: "https://cdn.synthesisvr.com/gameassets/svr_37324/header460x215_1720421660.webp",
    videoUrl: "/videos/pixel-hack.mp4",
    tags: ["co-op", "shooter", "roguelike", "retro"],
  },
];

export const allGames: Game[] = [...availableGames, ...comingSoonGames];

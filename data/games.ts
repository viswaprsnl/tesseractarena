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
  videoUrl?: string;
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
    players: "1-4",
    genre: "Zombie Survival",
    duration: "30 min",
    difficulty: "Medium",
    image: "https://images.worldofescapes.com/uploads/quests/22973/large/anvio-city-z.jpg",
    featured: true,
    tags: ["action", "co-op", "horror", "free-roam"],
  },
  {
    id: "city-z-survivors",
    title: "City Z: Survivors",
    provider: "anvio",
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
    provider: "anvio",
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
    provider: "anvio",
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
    id: "station-zarya",
    title: "Station Zarya",
    provider: "anvio",
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
    provider: "anvio",
    description:
      "Team-based competitive VR shooter with Deathmatch, Team Deathmatch, and Point Capture modes. Virtual reality reinvents laser tag.",
    players: "1-12",
    genre: "PvP Shooter",
    duration: "30 min",
    difficulty: "Medium",
    image: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2245750/header.jpg?t=1680893228",
    tags: ["pvp", "competitive", "action", "multiplayer"],
  },
  {
    id: "lost-sanctuary",
    title: "Lost Sanctuary",
    provider: "anvio",
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
    provider: "anvio",
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
    id: "prince-of-persia",
    title: "Prince of Persia: The Dagger of Time",
    provider: "anvio",
    description:
      "A Ubisoft VR escape game set in the Prince of Persia universe. Solve time-manipulation puzzles and climb through the Fortress of Time.",
    players: "1-4",
    genre: "Escape Room",
    duration: "30 min",
    difficulty: "Medium",
    image: "https://staticctf.ubisoft.com/J3yJr34U2pZ2Ieem48Dwy9uqj5PNUQTn/e9qxR05JFQf0FEo6EnkpZ/1703f8e5861f14bf2a6fc1a911dde7f1/TheDaggerOfTime_logo.png",
    featured: true,
    tags: ["puzzle", "escape-room", "co-op", "adventure"],
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
    image: "https://cdn.synthesisvr.com/gameassets/svr_5906/compress-1.jpg",
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
    image: "https://cdn.synthesisvr.com/gameassets/svr_78776/header460x215_1739344620.webp",
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
    image: "https://cdn.synthesisvr.com/gameassets/svr_78406/header460x215_1738909811.webp",
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
    image: "https://cdn.synthesisvr.com/gameassets/svr_27694/header_b1460x215_1698997964.webp",
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
    image: "https://cdn.synthesisvr.com/gameassets/svr_78307/header460x215_1731422933.webp",
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
    image: "https://cdn.synthesisvr.com/gameassets/svr_6208/header.webp",
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
    image: "https://cdn.synthesisvr.com/gameassets/svr_33685/header460x215_1707213306.webp",
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
    image: "https://cdn.synthesisvr.com/gameassets/svr_7564/header460x215_1694727655.webp",
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
    image: "https://cdn.synthesisvr.com/gameassets/svr_37837/header460x215_1727855823.webp",
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
    image: "https://cdn.synthesisvr.com/gameassets/svr_2144/header.webp",
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
    image: "https://cdn.synthesisvr.com/gameassets/svr_79722/header460x215_1768386727.webp",
    tags: ["shooter", "tactical", "co-op", "pvp"],
  },
];

export const allGames: Game[] = [...anvioGames, ...synthesisGames];

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  rating: number;
}

// Real Google reviews, transcribed from the arena's Google Business
// Profile (search "Tesseract VR Gaming Arena" on Google Maps). Names
// are shown as reviewers wrote them on Google — those are already
// public attribution on their own profile so no extra consent step
// is needed. Add new ones here as they come in.
export const testimonials: Testimonial[] = [
  {
    id: "aadilahmad-google",
    name: "Aadilahmad",
    role: "Google Review",
    content:
      "Absolutely incredible experience! The VR graphics are crisp, the motion tracking is flawless, and the game selection has something for everyone. It truly feels like you step into another world. The equipment was clean and well-maintained. Highly recommended for gamers and newcomers alike!",
    rating: 5,
  },
  {
    id: "karthik-gudala-google",
    name: "Karthik Gudala",
    role: "Google Review",
    content:
      "Had an amazing experience at Tesseract Arena! The VR setup was immersive, exciting, and really enjoyable. They have an amazing variety of games, so there's something for everyone. The entire experience was smooth, well-organized, and a lot of fun. Definitely a great place to try VR gaming, especially if it's your first time. Highly recommended!",
    rating: 5,
  },
  {
    id: "burila-nani-google",
    name: "Burila Nani",
    role: "Google Review",
    content:
      "Had a fun experience at Tesseract VR Gaming Arena. The VR games were engaging, the equipment worked well, and the staff were friendly and helpful. It's a good place to spend some time with friends and try something different. Overall, a fun and enjoyable experience.",
    rating: 5,
  },
  {
    id: "mohd-adnan-google",
    name: "Mohd Adnan",
    role: "Google Review",
    content:
      "Great gaming arena! The setup is really good, games run smoothly, and the overall vibe is fun. Staff are friendly and the place is clean. Had a great time here — definitely worth visiting with friends!",
    rating: 5,
  },
  {
    id: "chandu-gyadari-google",
    name: "Chandu Gyadari",
    role: "Google Review",
    content:
      "Just played Tesseract on VR, and it was an incredible experience! Loved the gameplay and visual immersion.",
    rating: 5,
  },
  {
    id: "md-faisal-google",
    name: "md faisal",
    role: "Google Review",
    content:
      "Really fun and unique VR experience! Great setup, friendly staff, and lots of fun. Definitely worth trying!",
    rating: 5,
  },
  {
    id: "ganesan-jan-google",
    name: "Ganesan J",
    role: "Corporate Group · Google Review",
    content:
      "Good experience, great enjoyment with our friends. We played for a few hours only but it gave great and emotional fun. They give corporate great discounts also.",
    rating: 5,
  },
  {
    id: "edunoori-pavan-google",
    name: "Edunoori Pavan",
    role: "Google Review",
    content: "Great experience of the virtual world.",
    rating: 5,
  },
  {
    id: "pathan-abdul-google",
    name: "Pathan Abdul",
    role: "Google Review",
    content: "Good gaming experience.",
    rating: 5,
  },
];

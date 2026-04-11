export interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  rating: number;
}

export const testimonials: Testimonial[] = [
  {
    id: "t1",
    name: "Marcus Chen",
    role: "Birthday Party Host",
    content:
      "My son's 14th birthday at Tesseract Arena was the best party we've ever thrown. The kids were completely blown away by City Z. Already planning our next visit!",
    rating: 5,
  },
  {
    id: "t2",
    name: "Sarah Rodriguez",
    role: "Team Building Organizer",
    content:
      "We brought our engineering team here for a team-building event. Station Zarya had us strategizing and communicating like never before. Way better than escape rooms.",
    rating: 5,
  },
  {
    id: "t3",
    name: "Jake Thompson",
    role: "VR Enthusiast",
    content:
      "I've tried VR arcades all over India, and Tesseract Arena is hands down the best. Free-roam makes all the difference — you forget you're in a room.",
    rating: 5,
  },
  {
    id: "t4",
    name: "Priya Sharma",
    role: "First-Time Player",
    content:
      "I was nervous about VR but the staff made it so easy. Lost Sanctuary was magical — I felt like I was actually in an ancient temple. Can't wait to try the zombie games next!",
    rating: 5,
  },
  {
    id: "t5",
    name: "David Park",
    role: "Regular Visitor",
    content:
      "The game library keeps growing and they rotate titles. Every time I come back there's something new to try. Prince of Persia is my current favorite.",
    rating: 4,
  },
  {
    id: "t6",
    name: "Emily Watson",
    role: "Date Night Adventurer",
    content:
      "Best date night in Hyderabad, hands down. We played After The Fall together and it was an absolute blast. So much better than dinner and a movie.",
    rating: 5,
  },
];

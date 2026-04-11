# Tesseract Arena

Marketing website for **Tesseract Arena** — Fremont's first multi-game standalone VR arena where groups of up to 4 players can play premium VR experiences together.

## Tech Stack

- **Framework:** Next.js 15 (App Router, TypeScript)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Animations:** Framer Motion + GSAP ScrollTrigger
- **3D Graphics:** React Three Fiber (hero particle field)
- **Icons:** Lucide React
- **Fonts:** Orbitron (headings) + Inter (body) via next/font
- **Forms:** React Hook Form + Zod validation

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home page with all sections (hero, games, pricing, FAQ, etc.) |
| `/games` | Full game library with search and filtering |
| `/book` | Booking form with validation |
| `/about` | About page with mission and values |
| `/contact` | Contact form and location info |
| `/faq` | Expanded FAQ |

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

## Project Structure

```
app/                    # Next.js App Router pages
components/
  layout/               # Navbar, Footer
  sections/             # Hero, HowItWorks, GamesLibrary, Features,
                        # Pricing, Testimonials, FAQ, Location
  three/                # ParticleField (React Three Fiber)
  ui/                   # shadcn/ui components
data/                   # Games, pricing, FAQ, testimonials data
lib/                    # Utilities and animation variants
```

## Deployment (Vercel)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Vercel auto-detects Next.js — click Deploy
4. Add custom domain: `tesseractarena.com`

### GoDaddy DNS Configuration

Add these DNS records in GoDaddy for `tesseractarena.com`:

| Type | Name | Value |
|------|------|-------|
| A | @ | 76.76.21.21 |
| CNAME | www | cname.vercel-dns.com |

Vercel handles SSL certificates automatically after DNS propagation (usually 24-48 hours).

## Design System

- **Background:** `#0A0A0F` (deep black)
- **Primary:** `#6C3BFF` (electric violet)
- **Accent:** `#00F5FF` (cyan)
- **Card:** `#1A1A2E`
- **Text:** White
- Dark mode only, glassmorphism cards, glow hover effects

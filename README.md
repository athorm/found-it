# FoundIt

A lost & found board for the LSPU campus community. Students can post lost or found items, browse active listings, and connect with the original poster to recover their belongings — no more scattered Facebook group posts or missed announcements.

<img width="1079" height="605" alt="image" src="https://github.com/user-attachments/assets/b677965f-6d1f-4850-9f85-9eba74cbbb56" />

## Features

- **Report lost/found items** with photos, a map pin for the location, category/item type, and specific details
- **Direct chat** between the item poster and the person who found (or lost) it, so recovery can be coordinated in-app
- **Real-time updates** — listings and chat messages sync live via Supabase real-time listeners, no manual refresh needed
- **Admin moderation dashboard** — new posts are screened by an AI content moderation model and routed to an admin panel for review before they go public, keeping the board spam- and abuse-free
- **Row-Level Security (RLS)** — PostgreSQL policies enforce that users can only modify their own posts and messages, while still allowing public read access to approved listings
- **Mobile-first, responsive UI** across desktop and mobile browsers

## Tech Stack

| Layer | Tools |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Backend | Supabase, PostgreSQL |
| Security | Row-Level Security (RLS) policies |
| AI/Moderation | Hugging Face content moderation API |
| Deployment | Vercel |

## My Role

I led development end-to-end as Full-Stack Developer:
- Designed the relational schema and RLS policies governing item posts, chat messages, and user access
- Built the real-time sync powering live listing updates and in-app chat
- Implemented the AI content moderation pipeline and the admin dashboard used to review flagged posts before they go public
- Built the user-facing pages and components (reporting flow, chat, listings) in Next.js/React, translating requirements from stakeholders into working features
- Coordinated priorities across design, backend, and deployment to ship on schedule

## Getting Started

Clone the repo and install dependencies:

```bash
npm install
```

Set up your environment variables (Supabase URL, anon key, Hugging Face API key) in a `.env.local` file — see `.env.example` for the required keys.

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Status

Actively maintained as a portfolio/campus project. Built as part of coursework at Laguna State Polytechnic University (LSPU) – Santa Cruz Campus.

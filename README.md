# 🎅 Secret Santa App

A simple Secret Santa gift exchange application built with Next.js and Vercel KV.

## Features

- 🎁 Admin interface to create Secret Santa events
- 🔗 Unique secret links for each participant
- 🎲 Full draw made when the event is created (no self-assignment, never dead-ends)
- 💰 Budget reminder displayed to each participant
- 🎨 Beautiful, responsive UI with dark mode support
- 🔒 Unique KV key prefixes to avoid conflicts with other projects

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** Vercel KV (Redis)
- **Deployment:** Vercel

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Vercel KV

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Create a new KV database or use an existing one
3. Copy the environment variables provided by Vercel

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
KV_REST_API_URL="your-rest-api-url"
KV_REST_API_TOKEN="your-rest-api-token"
```

You can get these values from your Vercel KV database settings (only these two variables are required).

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Deployment to Vercel

### Option 1: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Link your KV database in the Vercel dashboard

### Option 2: Deploy via GitHub

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will automatically detect Next.js
6. Add your KV database in the "Storage" tab
7. Environment variables will be automatically configured
8. Deploy!

## How to Use

### For Admin (You)

1. Go to `/setup-secret-santa` and enter the admin password (`ADMIN_PASSWORD`)
2. Enter participant names (at least 2), a budget and when and where
3. Click "Create the draw"
4. Copy each person's link and send it to them; the links stay available in the admin view

Draws are **active** (one at a time, links work) or **archived** (kept, links closed).
Any draw can be edited. "Reset links" gives everyone new links and matches; the old links stop working.
Archived draws can be made active again; making one active archives the current one.
Any draw can be deleted for good.

### For Participants

1. Open their own link
2. Click the box to reveal who they're buying a gift for
3. See the budget and when and where

## Important Notes

- All KV keys are prefixed with `secretsanta:` to avoid conflicts with other projects
- Everyone is shuffled into one circle when the draw is created; each person gives to the next
- No one is ever assigned to themselves, and any number of participants (2+) works
- Editing the people of an archived draw makes a new circle: same links, new matches
- Admin routes require the `x-admin-password` header to match `ADMIN_PASSWORD`

## Project Structure

```
.
├── app/
│   ├── api/
│   │   ├── setup/                # create a draw (admin)
│   │   ├── event-status/         # active and archived draws (admin)
│   │   ├── archive-draw/         # archive the active draw (admin)
│   │   ├── activate-draw/        # make an archived draw active (admin)
│   │   ├── update-draw/          # edit a draw (admin)
│   │   ├── reset-draw/           # new links and matches, old links die (admin)
│   │   ├── delete-draw/          # delete a draw (admin)
│   │   └── reveal/[id]/          # read or reveal one person's match
│   ├── setup-secret-santa/
│   │   └── page.tsx              # Admin interface
│   ├── reveal/[id]/
│   │   └── page.tsx              # Participant reveal page
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                  # Home page
├── lib/
│   ├── auth.ts                   # admin password check
│   └── kv.ts                     # draws, participants, draw logic
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## KV Data Structure

All keys use the prefix `secretsanta:` to avoid conflicts.

| Key | Value |
|-----|-------|
| `secretsanta:draws` | list of draw ids, newest first |
| `secretsanta:active-draw` | id of the active draw; absent when none |
| `secretsanta:draw:{id}` | `Draw` |
| `secretsanta:participant:{id}` | `Participant`; the id is the secret link |

```typescript
interface Draw {
  id: string;
  status: "active" | "archived";
  eventDate: string | null; // YYYY-MM-DD, names the draw; Stockholm time
  eventTime: string | null; // HH:MM, the countdown target
  budgetMessage: string;
  eventDetails: string;
  createdAt: number;
  archivedAt: number | null;
  participantIds: string[];
}

interface Participant {
  id: string;
  drawId: string;
  name: string;
  assignedTo: string; // participant id they give to
  hasRevealed: boolean;
}
```

Creating a draw claims `active-draw` with `SET NX`, so only one draw can be active.
A reveal writes only that participant's key, so concurrent reveals don't overwrite each other.

## Support

For issues or questions, please check the code comments or create an issue in the repository.

---

🎄 Happy Secret Santa! 🎅

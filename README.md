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

1. Go to `/setup-secret-santa`
2. Enter participant names (at least 2)
3. Set a budget message
4. Click "Generate Secret Santa Links"
5. Copy and share each unique link with the corresponding participant

### For Participants

1. Click on their unique secret link
2. Click "Reveal My Secret Santa"
3. See who they're buying a gift for
4. View the budget reminder

## Important Notes

- ✅ All KV keys are prefixed with `secretsanta:` to avoid conflicts with other projects
- ✅ Participants can only reveal once (subsequent visits show the same assignment)
- ✅ Everyone is shuffled into one circle when the event is created; each person gives to the next
- ✅ No one is ever assigned to themselves, and any number of participants (2+) works
- ⚠️ Currently supports one active Secret Santa event at a time
- ⚠️ Save the generated links - they cannot be retrieved later!

## Project Structure

```
.
├── app/
│   ├── api/
│   │   ├── setup/
│   │   │   └── route.ts          # API to create events
│   │   └── reveal/[id]/
│   │       └── route.ts          # API to reveal assignments
│   ├── setup-secret-santa/
│   │   └── page.tsx              # Admin interface
│   ├── reveal/[id]/
│   │   └── page.tsx              # Participant reveal page
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                  # Home page
├── lib/
│   └── kv.ts                     # Vercel KV helper functions
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## KV Data Structure

All keys use the prefix `secretsanta:` to avoid conflicts.

### Event Data
- **Key:** `secretsanta:event`
- **Value:**
  ```typescript
  {
    participants: Participant[],
    budgetMessage: string,
    createdAt: number
  }
  ```

### Participant Data
- **Key:** `secretsanta:participant:{id}`
- **Value:**
  ```typescript
  {
    id: string,
    name: string,
    hasRevealed: boolean,
    assignedTo: string | null
  }
  ```

## Resetting the Event

If you need to create a new event, the app currently overwrites the existing event. For production use, you might want to add a way to delete old events or support multiple events.

You can manually delete KV data through the Vercel dashboard if needed.

## Support

For issues or questions, please check the code comments or create an issue in the repository.

---

🎄 Happy Secret Santa! 🎅

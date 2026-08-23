# LinguaQuest

A gamified listening comprehension app for Grade 7 Filipino students. Students progress through 7 islands, each targeting a specific listening skill, by completing audio-based multiple-choice challenges. Includes a multiplayer mode and a teacher dashboard for monitoring student performance.

---

## Tech Stack

**Frontend**

- React Native (Expo SDK 55)
- Expo Router (file-based navigation)
- Zustand (state management)
- TanStack React Query (data fetching)
- NativeWind / Tailwind CSS (styling)
- React Native Reanimated (animations)
- Expo Audio (audio playback)
- Pusher JS (real-time multiplayer)
- Expo SecureStore (token storage)
- TypeScript

**Backend**

- Next.js 16 (API routes)
- Prisma ORM with Neon serverless PostgreSQL
- Jose (JWT authentication)
- Pusher (real-time events)
- Cloudinary (audio/image uploads)
- Google Auth Library (OAuth)
- TypeScript

---

## Project Structure

```
/                        # React Native (Expo) frontend
├── app/
│   ├── (auth)/          # Login, onboarding, tutorial
│   ├── (main)/          # Dashboard, map, island, quest, profile, badges
│   └── (multiplayer)/   # Lobby, game, results
├── components/          # Shared UI, character, audio, scene, map components
├── stores/              # Zustand stores (auth, audio, multiplayer)
├── hooks/               # Custom hooks
├── lib/                 # API client, Google Sign-In config
├── types/               # TypeScript interfaces
└── assets/              # Images and audio

backend/                 # Independently runnable Next.js API server
├── app/api/             # API routes (auth, islands, progress, multiplayer, teacher, admin)
├── lib/                 # Auth, DB client, Pusher, ship logic
├── prisma/              # Schema and seed data
└── types/               # Shared TypeScript types
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Expo CLI (`npm install -g expo-cli`)
- A running local backend or another explicitly configured backend URL

Clone the canonical project before setting up either component:

```bash
git clone https://github.com/NOTMORSE-PROG/LinguaQuest.git
cd LinguaQuest
```

### Frontend Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env.local` file in the root:

```env
EXPO_PUBLIC_API_URL=http://<your-local-ip>:3001/api
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<your-google-oauth-client-id>
EXPO_PUBLIC_PUSHER_KEY=<your-pusher-key>
EXPO_PUBLIC_PUSHER_CLUSTER=ap1
```

3. Start the dev server:

```bash
npm start
```

Use the Expo Go app on your device or run on a simulator:

```bash
npm run android
npm run ios
```

---

### Backend Setup

The backend lives in the `/backend` directory and is an independently runnable Next.js app maintained in this same repository.

See the dedicated [`backend/README.md`](backend/README.md) for its API areas, environment-variable reference, database cautions, and complete command list.

1. Navigate to the backend:

```bash
cd backend
npm install
```

2. Create a `.env` file in `/backend`:

```env
DATABASE_URL="postgresql://user:password@host/linguaquest?sslmode=require"
DIRECT_URL="postgresql://user:password@host/linguaquest?sslmode=require"

JWT_SECRET="your-jwt-secret"

PUSHER_APP_ID="your-pusher-app-id"
PUSHER_KEY="your-pusher-key"
PUSHER_SECRET="your-pusher-secret"
PUSHER_CLUSTER="ap1"

GOOGLE_WEB_CLIENT_ID="your-google-client-id"

CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

3. Generate the Prisma client and push the schema:

```bash
npm run db:generate
npm run db:push
```

4. (Optional) Seed the database:

```bash
npm run db:seed
```

5. Start the dev server (runs on port 3001):

```bash
npm run dev
```

---

## Database Commands

| Command | Description |
|---|---|
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema changes to the database |
| `npm run db:migrate` | Run production migrations |
| `npm run db:seed` | Seed the database with island and challenge data |
| `npm run db:studio` | Open Prisma Studio |

---

## User Roles

| Role | Access |
|---|---|
| STUDENT | Story mode, multiplayer, profile |
| TEACHER | Student progress, performance analytics, mistake review |
| ADMIN | Audio upload and management |

## Deployment Status

No active production deployment was found for LinguaQuest during the consolidation audit. The repository is ready for local development, but publishing the frontend or backend is a separate rollout task. A future backend deployment should use `backend/` as its root directory and should not claim an existing public URL unless that URL has been verified.

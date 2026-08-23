# LinguaQuest Backend

The LinguaQuest backend is a Next.js API and teacher dashboard for the mobile learning application. It handles authentication, islands and quests, student progress, badges, multiplayer sessions, teacher reporting, and administrative audio uploads.

This component is maintained inside the canonical `https://github.com/NOTMORSE-PROG/LinguaQuest` repository at `backend/`.

## Technology

- Next.js 16 and TypeScript
- Prisma with Neon PostgreSQL
- JWT authentication with `jose`
- Pusher for multiplayer events
- Cloudinary for audio and image uploads
- Google OAuth

## Local Setup

Prerequisites:

- Node.js 20+
- PostgreSQL or a Neon connection string
- Pusher, Google OAuth, and Cloudinary credentials for the features that use them

```bash
git clone https://github.com/NOTMORSE-PROG/LinguaQuest.git
cd LinguaQuest/backend
npm install
cp .env.example .env
npm run db:generate
npm run db:push
npm run dev
```

The development server runs at `http://localhost:3001`.

`db:push` changes the configured database schema. Use only a development database unless you deliberately intend to update another environment.

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection used by the application |
| `DIRECT_URL` | Direct PostgreSQL connection used by Prisma operations |
| `JWT_SECRET` | Signs and verifies authentication tokens |
| `PUSHER_APP_ID` | Pusher application identifier |
| `PUSHER_KEY` | Pusher public key |
| `PUSHER_SECRET` | Pusher secret |
| `PUSHER_CLUSTER` | Pusher cluster, such as `ap1` |
| `GOOGLE_WEB_CLIENT_ID` | Google OAuth web client identifier |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `DEV_EMAILS` | Optional comma-separated development accounts with test-only access |

Never commit real credential values. Treat the tracked `.env.example` as a template, review every entry for your environment, and keep working values in the ignored `.env` file.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start Next.js on port 3001 |
| `npm run build` | Generate Prisma Client and create a production build |
| `npm start` | Start the production build |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript without emitting files |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:push` | Push the Prisma schema to the configured database |
| `npm run db:migrate` | Apply production migrations |
| `npm run db:seed` | Seed the configured database |
| `npm run db:studio` | Open Prisma Studio |

## Main Areas

| Path | Responsibility |
|---|---|
| `app/api/auth/` | Email and Google authentication |
| `app/api/islands/` | Island, pin, and tutorial progress |
| `app/api/progress/` | Student progress and synchronization |
| `app/api/multiplayer/` | Rooms, rounds, votes, chat, and timeouts |
| `app/api/teacher/` | Students, performance, mistakes, and badges |
| `app/api/admin/` | Administrative audio management |
| `app/(teacher)/` | Teacher dashboard pages |
| `prisma/` | Database schema, migrations, and seed data |

## Deployment Status

No active production deployment was found for LinguaQuest during the consolidation audit. Deploying this component is a separate rollout task. A future service should use `backend/` as its root directory and should be verified before any public URL is documented.

Return to the [project README](../README.md) for mobile-app setup and the complete repository layout.

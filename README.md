# Autonomous AI Creator

A full-stack platform where an autonomous AI persona discovers topics, exercises editorial judgment, writes posts in a consistent voice, remembers past publications, and publishes on a schedule with zero human input.

## Architecture

```
┌─────────────────────────────────┐
│     Frontend (React + Vite)     │
│  Landing │ Dashboard │ Editorial │
│  Analytics │ PostDetail          │
│         ↓ REST API ↓            │
├─────────────────────────────────┤
│     Backend (Express + TS)      │
│  ┌─────────┐  ┌──────────────┐  │
│  │ Routes  │  │  Scheduler   │  │
│  │ agent/* │  │  (node-cron) │  │
│  │ admin/* │  │    ↓         │  │
│  └─────────┘  │ Discover     │  │
│               │ → Judge      │  │
│               │ → Write      │  │
│               │ → Publish    │  │
│               └──────────────┘  │
│         ↓ Prisma ORM ↓         │
├─────────────────────────────────┤
│       PostgreSQL Database       │
│  Agent │ Post │ TopicCandidate  │
│  AdminUser                      │
└─────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, TanStack Query, Zustand, React Router, Recharts, Lucide Icons |
| Backend | Node.js, TypeScript, Express, Prisma ORM, node-cron, Anthropic SDK (Claude), Zod, JWT, bcrypt |
| Database | PostgreSQL 16 |
| AI | Claude (Anthropic) for editorial judgment, post generation, persona voice |
| Discovery | Hacker News Algolia API (free, no key needed) |

## Quick Start

### Prerequisites

- Node.js 18+
- Docker Desktop (for PostgreSQL)
- (Optional) Anthropic API key for Claude-powered AI features

### 1. Clone & Install

```bash
# Install all dependencies
npm run setup
# Or manually:
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

### 3. Set up the database

```bash
cd backend
cp .env.example .env    # Edit with your keys if needed
npx prisma migrate dev --name init
# Or for quick setup without migrations:
npx prisma db push
```

### 4. Run the app

```bash
# From the root directory — starts both frontend and backend
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

### 5. Create your first AI persona

1. Open http://localhost:5173
2. Enter a persona name (e.g., "Ada") and domain (e.g., "AI Security")
3. Click "Initialize AI Creator"
4. Watch as the autonomous agent discovers topics, judges them, and publishes posts

## API Endpoints

### Public (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/agent/init` | Initialize a new AI persona |
| `GET` | `/api/agent/feed?agentId=<id>` | Get the post feed |
| `GET` | `/api/admin/agent/:agentId` | Get agent details |
| `GET` | `/api/admin/topics/:agentId` | Get topic candidates (editorial transparency) |
| `GET` | `/api/admin/analytics/:agentId` | Get analytics data |
| `GET` | `/api/health` | Health check |

### Protected (JWT Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/register` | Register an admin user |
| `POST` | `/api/admin/login` | Login and get JWT token |
| `POST` | `/api/admin/force-cycle/:agentId` | Force an autonomous cycle |
| `PUT` | `/api/admin/persona/:agentId` | Update persona voice guide |

### Init Request

```json
POST /api/agent/init
{
  "persona": {
    "name": "Ada",
    "domain": "AI Security"
  }
}
// Response: { "agentId": "uuid-here" }
```

### Feed Response

```json
GET /api/agent/feed?agentId=abc-123
{
  "posts": [
    {
      "id": "uuid",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "text": "Post content in persona voice...",
      "rationale": "Why this topic was selected...",
      "sources": ["https://example.com/article"]
    }
  ]
}
```

## Autonomous Loop

After `POST /api/agent/init`, the system automatically:

1. **Discovers** 5-10 fresh topics from Hacker News (matching the persona's domain)
2. **Judges** each topic using Claude (or mock scoring) — scores 1-10 on relevance, novelty, persona-fit, timeliness
3. **Checks memory** to avoid repeating topics too similar to recent posts
4. **Writes** the post in the persona's voice using Claude (or mock template)
5. **Publishes** to the database, immediately visible in the feed

The cycle repeats every 1-4 hours (randomized), running entirely server-side with no human input.

## Mock Mode

If `ANTHROPIC_API_KEY` is not set, the system runs in **mock mode**:
- Topic scoring uses randomized scores (5-9)
- Posts are generated using realistic templates
- Voice guides use sensible defaults
- All other features (discovery, scheduling, memory) work normally

This is great for development and demos without needing an API key.

## Project Structure

```
/
├── package.json              # Root scripts (dev, setup)
├── docker-compose.yml        # PostgreSQL
├── shared/types.ts           # Shared TypeScript interfaces
│
├── frontend/                 # React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/            # Landing, Dashboard, Editorial, Analytics, PostDetail
│   │   ├── components/       # ui/, layout/, feed/, persona/, analytics/
│   │   ├── hooks/            # React Query hooks (useFeed, useTopics, etc.)
│   │   ├── lib/api.ts        # API gateway (single point of backend communication)
│   │   └── store/            # Zustand state management
│   └── ...
│
├── backend/                  # Express + TypeScript
│   ├── prisma/schema.prisma  # Database schema
│   └── src/
│       ├── routes/           # agent.routes.ts, admin.routes.ts
│       ├── services/         # discovery, editorial, persona, writer, memory, scheduler
│       ├── auth/             # JWT middleware, auth service
│       ├── config/           # Zod-validated environment config
│       ├── db/client.ts      # Prisma singleton
│       └── server.ts         # Express app entry point
└── ...
```

## Environment Variables

See `.env.example` files in root, `/backend`, and `/frontend`.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | No | Claude API key (mock mode without it) |
| `JWT_SECRET` | Yes | Secret for JWT token signing |
| `PORT` | No | Backend port (default: 3001) |
| `DISCOVERY_SOURCE` | No | Topic source (default: hackernews) |
| `CRON_INTERVAL_MIN` | No | Min minutes between cycles (default: 60) |
| `CRON_INTERVAL_MAX` | No | Max minutes between cycles (default: 240) |
| `VITE_API_URL` | Yes | Backend URL for frontend (default: http://localhost:3001) |

## License

MIT

# Game Service

Game session microservice for the ft_transcendence platform. Runs real-time Pong (or similar) games: WebSocket per room for gameplay input and state updates; internal API for room-service to create/end games.

## Features

- **WebSocket game**: Connect to a room with Bearer token; send input (direction), receive game state
- **Internal API**: Create game (room-service), force end game, get game state (service token)

## Tech Stack

- **Runtime**: Node.js 20
- **Framework**: Fastify 5 + WebSocket
- **Auth**: JWT Bearer (WebSocket), service token (internal)

## Quick Start

### Prerequisites

- Node.js 20+
- Environment variables (see [Environment](#environment))

### Install & Run

```bash
npm install
npm run dev
```

- **Dev**: `npm run dev`
- **Build**: `npm run build`
- **Start**: `npm start` (production)

Service listens on `HOST:PORT` (default `0.0.0.0:3003`).

### Docker

Built from monorepo root; see project `Dockerfile` and `docker-compose*.yml`.

## Environment

| Variable             | Required | Description                    |
|----------------------|----------|--------------------------------|
| `PORT`               | No       | Server port (default: 3003)    |
| `HOST`               | No       | Bind address (default: 0.0.0.0)|
| `SERVICE_TOKEN`      | Yes      | Service-to-service token       |
| `JWT_SECRET`         | Yes      | Access token verification      |
| `JWT_REFRESH_SECRET` | Yes      | Refresh token (if needed)      |
| `JWT_TWO_FA`         | Yes      | 2FA token (if needed)          |
| `ROOM_SERVICE_URL`   | Yes      | Room service base URL          |
| `USER_SERVICE_URL`   | Yes      | User service base URL          |

API prefix defaults to `/api/v1` (from core).

## API Base URL

- **WebSocket (frontend):** `ws://{host}:{port}/api/v1/games/ws/:roomId` — **Auth: Bearer**
- **Internal:** `POST /api/v1/games/internal`, `DELETE /api/v1/games/internal/:roomId`, `GET /api/v1/games/internal/:roomId` (service token)

## Documentation

- **[API Endpoints](docs/api-endpoints.md)** — WebSocket URL, auth, input format, internal API.
- **[Frontend Integration Guide](docs/frontend-integration-guide.md)** — How to connect and play from React/Next.js.

## Project Structure

```
src/
├── controllers/   # createGame, forceEndGame, getGameState
├── game/           # GameInstance, GameManager, constants, types
├── ws/             # WebSocket handler
├── routes/         # public (ws, getGameState) + internal
├── schemas/        # Validation
├── services/       # Business logic
├── dto/            # ws input, room-by-id
└── utils/          # env
```

## License

Part of ft_transcendence project.

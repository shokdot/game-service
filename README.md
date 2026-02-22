# Game Service

> Part of the [ft_transcendence](https://github.com/shokdot/ft_transcendence) project.

Real-time Pong game session microservice. Manages game instances per room via WebSocket: players send directional input and receive game state at ~60 fps. Internal API allows room-service to create, query, and force-end games.

## Tech Stack

- **Runtime**: Node.js 20
- **Framework**: Fastify 5 + WebSocket
- **Auth**: JWT Bearer (WebSocket), service token (internal)

## Quick Start

```bash
npm install
npm run dev
```

Service listens on `HOST:PORT` (default `0.0.0.0:3003`).

### Docker

Built from monorepo root; see project `Dockerfile` and `docker-compose*.yml`.

## Environment

| Variable             | Required | Description                      |
|----------------------|----------|----------------------------------|
| `PORT`               | No       | Server port (default: 3003)      |
| `HOST`               | No       | Bind address (default: 0.0.0.0)  |
| `SERVICE_TOKEN`      | Yes      | Service-to-service token         |
| `JWT_SECRET`         | Yes      | Access token verification        |
| `ROOM_SERVICE_URL`   | Yes      | Room service base URL            |
| `USER_SERVICE_URL`   | Yes      | User service base URL            |

---

## API Endpoints

Base URL: **`{GAME_SERVICE_URL}/api/v1/games`**

---

### WebSocket (frontend)

#### `GET /ws/:roomId` (WebSocket Upgrade)

Connect to the game for a specific room. **Auth:** `Authorization: Bearer <accessToken>` header.

**URL:** `ws://{host}:{port}/api/v1/games/ws/:roomId` (or `wss://` in production)

**Params:** `roomId` — Room ID from room-service

User must be a player in that room. On auth failure or invalid room, the server closes the connection:
- `1008` — Invalid token
- `4003` — Not allowed in this room
- `4004` — Game not found

---

#### Client → Server (WebSocket)

**Input message:**

```json
{
  "type": "input",
  "direction": -1
}
```

`direction`: `-1` (up/left), `0` (neutral), `1` (down/right). Rate-limited to ~20/sec.

---

#### Server → Client (WebSocket)

| Type                        | Payload                                                          | Description                                                  |
|-----------------------------|------------------------------------------------------------------|--------------------------------------------------------------|
| `player_assignment`         | `{ playerNumber: 1\|2, players: string[] }`                     | Sent on connect — which paddle you control + all player IDs  |
| `countdown`                 | `{ count: number }`                                              | Countdown tick (3, 2, 1) before game starts/resumes          |
| `state`                     | `{ state: GameState }`                                           | Periodic game state update (~60 fps). First = game started   |
| `reconnected`               | `{ state: GameState, playerNumber: 1\|2, players: string[] }`   | Sent on reconnect with current state and player info         |
| `game_resumed`              | —                                                                | Both players reconnected — countdown follows                 |
| `opponent_disconnected`     | `{ userId: string }`                                             | Opponent lost connection (30s to reconnect)                  |
| `opponent_left_permanently` | —                                                                | Opponent did not reconnect in time                           |
| `you_win`                   | `{ result: GameResult }`                                         | You won                                                      |
| `you_lose`                  | `{ result: GameResult }`                                         | You lost                                                     |
| `game_end`                  | —                                                                | Final signal — connection will close                         |

---

### Internal API (backend only)

**Auth:** Service token (`x-service-token` header). Not for frontend use.

#### `POST /internal`

Create a game for a room (called by room-service). Body is service-specific (e.g. `roomId`, `winScore`).

#### `GET /internal/:roomId`

Get current game state for a room. Not for frontend (frontend uses WebSocket).

#### `DELETE /internal/:roomId`

Force end a game in a room.

---

### Summary

| Type      | Path                      | Auth    | Purpose                 |
|-----------|---------------------------|---------|-------------------------|
| WebSocket | `/ws/:roomId`             | Bearer  | Play game (input+state) |
| HTTP POST | `/internal`               | Service | Create game             |
| HTTP GET  | `/internal/:roomId`       | Service | Get game state          |
| HTTP DEL  | `/internal/:roomId`       | Service | Force end game          |

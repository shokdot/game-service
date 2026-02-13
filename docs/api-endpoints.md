# Game Service — API Endpoints

Base URL: **`{GAME_SERVICE_URL}/api/v1/games`**

---

## WebSocket (frontend)

### GET `/ws/:roomId` (WebSocket)

Connect to the game for a room. **Auth:** Bearer access token in `Authorization` header when opening the WebSocket.

**URL:** `ws://{host}:{port}/api/v1/games/ws/:roomId` (or `wss://` in production)

**Params:** `roomId` — Room ID (from room-service).

**Connection:** User must be a player in that room. If auth fails or user not allowed, the server closes the connection with an error code (e.g. 1008 for token, 4003 for not allowed, 4004 for game not found). On success, the client can send input and receive game state updates.

---

## Client → server (WebSocket)

**Input message:**

```json
{
  "type": "input",
  "direction": -1
}
```

- `direction`: `-1` (e.g. up/left), `0` (neutral), `1` (e.g. down/right). Rate-limited (e.g. max 20/sec).

---

## Server → client (WebSocket)

All messages are JSON with a `type` field:

| Type | Payload | Description |
|------|---------|-------------|
| `player_assignment` | `{ playerNumber: 1 \| 2, players: string[] }` | Sent once on connect — tells the client which paddle they control and includes all player userIds |
| `countdown` | `{ count: number }` | Countdown tick (3, 2, 1) before game starts/resumes |
| `state` | `{ state: GameState }` | Periodic game state update (60 fps) — first `state` means game has started |
| `reconnected` | `{ state: GameState, playerNumber: 1 \| 2, players: string[] }` | Sent on reconnection with current state, player number, and all player userIds |
| `game_resumed` | — | Both players reconnected — countdown will follow |
| `opponent_disconnected` | `{ userId: string }` | Opponent lost connection (30 s to reconnect) |
| `opponent_left_permanently` | — | Opponent did not reconnect in time |
| `you_win` | `{ result: GameResult }` | You won the game |
| `you_lose` | `{ result: GameResult }` | You lost the game |
| `game_end` | — | Final signal — connection will close |

---

## Internal API (backend only)

Used by room-service. **Auth:** Service token (e.g. `x-service-token`).

### POST `/internal`

Create a game for a room. Body and response are service-specific (e.g. roomId, winScore). Not for frontend.

### GET `/internal/:roomId`

Get game state for a room. **Auth:** Service token. Not for frontend (frontend uses WebSocket for live state).

### DELETE `/internal/:roomId`

Force end a game. **Auth:** Service token. Not for frontend.

---

## Summary

| Type       | Path                | Auth    | Purpose              |
|------------|---------------------|---------|----------------------|
| WebSocket  | `/ws/:roomId`       | Bearer  | Play game (input + state) |
| HTTP       | `POST /internal`    | Service | Create game          |
| HTTP       | `GET /internal/:roomId`  | Service | Get game state   |
| HTTP       | `DELETE /internal/:roomId`| Service | Force end game  |

Frontend uses only the WebSocket at `/ws/:roomId` with Bearer token.

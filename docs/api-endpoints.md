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

Game state updates are sent as JSON; structure is service-specific (e.g. paddles, ball, score). Parse and render in the game UI.

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

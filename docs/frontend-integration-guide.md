# Frontend Integration Guide — Game Service

How a **React/Next.js** frontend should integrate with the Game Service: WebSocket connection, auth, and gameplay flow.

---

## Base URL and auth

- **WebSocket URL**: `ws://{host}:{port}/api/v1/games/ws/:roomId` (use `wss://` in production).
- **Auth**: Send access token (from Auth Service) when opening the WebSocket. The server expects `Authorization: Bearer <accessToken>`. Use custom headers if your WebSocket client supports them; otherwise the backend may support a query param (e.g. `?token=...`).

---

## 1. Connect to game

**Purpose:** Join the game session for a room (user must already be in the room via room-service).

**Flow:**

1. User has a `roomId` (e.g. from room-service: create room, join room, or matchmaking).
2. Obtain access token (from Auth Service).
3. Open WebSocket to `wss://{host}/api/v1/games/ws/{roomId}` with Bearer token (header or query, as supported).
4. On open: connection ready; listen for game state messages and render (paddles, ball, score).
5. On close: handle codes (e.g. 1008 = token invalid, 4003 = not allowed, 4004 = game not found); optionally refresh token and reconnect.

**Example (pseudo):**

```ts
const ws = new WebSocket(
  `wss://${host}/api/v1/games/ws/${roomId}?token=${accessToken}`
);
ws.onmessage = (event) => {
  const state = JSON.parse(event.data);
  setGameState(state); // e.g. paddles, ball, scores
};
```

---

## 2. Send input

**Purpose:** Send paddle (or similar) direction to the server.

**Flow:** Send a JSON string over the WebSocket:

```json
{
  "type": "input",
  "direction": -1
}
```

- `direction`: `-1` (e.g. up/left), `0` (neutral), `1` (e.g. down/right). Respect rate limit (e.g. ~20 messages/sec).

**Example:**

```ts
ws.send(JSON.stringify({ type: 'input', direction: 1 }));
```

---

## 3. Handle server messages

All server messages are JSON with a `type` field. Handle them in `ws.onmessage`:

| Type | When | What to do |
|------|------|------------|
| `player_assignment` | Right after connect | Store `playerNumber` (1 or 2) to determine which paddle is yours and whether to mirror the view. Use `players` array (userIds) to fetch opponent's profile |
| `countdown` | Both players connected | Show countdown overlay (3, 2, 1). Game starts after countdown reaches 0 |
| `state` | Every tick (~60 fps) | Update game rendering (paddles, ball, score). First `state` message means game has started |
| `reconnected` | After reconnecting | Restore `playerNumber` and game state; use `players` array to fetch opponent info; countdown will follow |
| `game_resumed` | Opponent reconnected | Both players back — countdown will follow before gameplay resumes |
| `opponent_disconnected` | Opponent lost connection | Show reconnection countdown (30 s) |
| `opponent_left_permanently` | Opponent timed out | Show win screen |
| `you_win` / `you_lose` | Game ended normally | Show result screen with `result.finalScore` and `result.gameDuration` |
| `game_end` | Final signal | Close connection, redirect to lobby or stats |

**Important:** Use the `playerNumber` from `player_assignment` to determine perspective. Player 1 controls the left paddle; Player 2 controls the right paddle. Mirror ball position and scores accordingly for Player 2.

---

## 4. Flow summary

1. **Lobby / matchmaking** (room-service): Create room, join room, or enter matchmaking queue → get `roomId`.
2. **Navigate to game:** Open `/game/:roomId` (or similar).
3. **Connect WebSocket:** Open `wss://.../api/v1/games/ws/:roomId` with Bearer token.
4. **Wait for countdown:** Both players connect → server sends `countdown` (3, 2, 1) → show overlay.
5. **Play:** After countdown, server sends `state` messages at 60 fps. Send `{ type: "input", direction }` on user input; render state.
6. **Leave / end:** On disconnect or game over, close WebSocket and redirect (e.g. to lobby or stats).

---

## Quick reference

| Action        | What to do                                                                 |
|---------------|----------------------------------------------------------------------------|
| Connect       | Open WebSocket to `/api/v1/games/ws/:roomId` with Bearer token             |
| Send input    | Send `{ type: "input", direction: -1 | 0 | 1 }`                             |
| Receive state | Parse JSON and update game UI                                              |
| On close      | Handle error codes; redirect to lobby or stats                             |

Use the same access token as for Auth Service; on 401/close, refresh token and reconnect if appropriate.

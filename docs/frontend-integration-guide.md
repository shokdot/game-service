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

## 3. Handle game state and end of game

**State updates:** Parse incoming JSON and update UI (positions, score, etc.). Structure is defined by the game logic (see backend or API docs).

**End of game:** Server may send a final state or close the connection. On close, redirect to lobby or match history (e.g. stats-service).

---

## 4. Flow summary

1. **Lobby / matchmaking** (room-service): Create room, join room, or enter matchmaking queue → get `roomId`.
2. **Navigate to game:** Open `/game/:roomId` (or similar).
3. **Connect WebSocket:** Open `wss://.../api/v1/games/ws/:roomId` with Bearer token.
4. **Play:** Send `{ type: "input", direction }` on user input; render state from server messages.
5. **Leave / end:** On disconnect or game over, close WebSocket and redirect (e.g. to lobby or stats).

---

## Quick reference

| Action        | What to do                                                                 |
|---------------|----------------------------------------------------------------------------|
| Connect       | Open WebSocket to `/api/v1/games/ws/:roomId` with Bearer token             |
| Send input    | Send `{ type: "input", direction: -1 | 0 | 1 }`                             |
| Receive state | Parse JSON and update game UI                                              |
| On close      | Handle error codes; redirect to lobby or stats                             |

Use the same access token as for Auth Service; on 401/close, refresh token and reconnect if appropriate.

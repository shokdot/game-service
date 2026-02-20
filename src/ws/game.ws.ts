import { WebSocket } from "ws";
import { FastifyRequest } from "fastify";
import { gameManager } from "src/game/GameManager.js";
import { roomByIdDTO } from "src/dto/room-by-id.dto.js";
import { isValidWsInput } from "src/dto/ws-input.dto.js";
import { authenticateWs } from '@core/index.js'

const wsHandler = (ws: WebSocket & { isAlive?: boolean }, request: FastifyRequest) => {
	try {
		ws.isAlive = true;
		ws.on('pong', () => { ws.isAlive = true; });

		// Browser WebSocket API doesn't support custom headers,
		// so accept token from query param as fallback
		const authHeader = request.headers['authorization']
			?? ((request.query as any)?.token ? `Bearer ${(request.query as any).token}` : undefined);
		const authResult = authenticateWs(authHeader, ws);
		const { userId } = authResult;

		const { roomId } = request.params as roomByIdDTO;
		const game = gameManager.getGame(roomId);

		if (!game) {
			ws.close(4004, 'Game not found');
			return;
		}

		gameManager.addPlayer(roomId, userId, ws);

		let lastMessageTime = 0;
		const MIN_MESSAGE_INTERVAL = 20; // Max 50 messages per second

		ws.on('message', (msg) => {
			try {
				const data = JSON.parse(msg.toString());

				if (data.direction !== 0 && data.type !== "leave") {
					const now = Date.now();
					if (now - lastMessageTime < MIN_MESSAGE_INTERVAL) return;
					lastMessageTime = now;
				}

				if (data.type === "leave") {
					gameManager.removePlayer(roomId, ws);
					return;
				}

				if (!isValidWsInput(data)) return;

				const player = [...game.players].find(p => p.socket === ws);
				if (!player) return;

				game.instance.handleInput(player.playerNumber, data.direction);
			} catch { }
		});

		ws.on('close', () => {
			gameManager.handleDisconnect(roomId, ws);
		});
	}
	catch (error) {
		// ... (rest of error handling remains same)
		switch (error.code) {
			case 'ACCESS_TOKEN_MISSING':
				ws.close(1008, 'ACCESS_TOKEN_MISSING');
				break;
			case 'INVALID_ACCESS_TOKEN':
				ws.close(1008, 'INVALID_ACCESS_TOKEN');
				break;
			case 'USER_NOT_ALLOWED':
				ws.close(4003, 'User not allowed in this game');
				break;
			case 'ROOM_FULL':
				ws.close(4003, 'Room is full');
				break;
			default:
				ws.close(1011, 'INTERNAL_SERVER_ERROR');
		}
	}
};

export default wsHandler;

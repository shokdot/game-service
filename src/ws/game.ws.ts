import { WebSocket } from "ws";
import { FastifyRequest } from "fastify";
import { gameManager } from "src/game/GameManager.js";
import authenticateWs from '@core/utils/authenticate.ws.js'
import { z } from 'zod';

// WebSocket message validation schema
const WebSocketMessageSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('input'),
		direction: z.number().int().min(-1).max(1),
	}),
]);

type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 1000; // 1 second
const RATE_LIMIT_MAX_MESSAGES = 60; // 60 messages per second
const MESSAGE_SIZE_LIMIT = 1024; // 1KB

// Rate limiting tracking
const rateLimitMap = new Map<WebSocket, { count: number; resetTime: number }>();

const wsHandler = (ws: WebSocket, request: FastifyRequest) => {
	try {
		const authResult = authenticateWs(request.headers['authorization'], ws);

		const { userId } = authResult;

		const { roomId } = request.params as { roomId: string };
		const game = gameManager.getGame(roomId);

		if (!game)
			ws.close();

		const playerNumber = gameManager.addPlayer(roomId, userId, ws);

		if (!playerNumber) {
			ws.close();
			return;
		}

		ws.on('message', (msg) => {
			try {
				// Convert RawData to string
				const msgString = msg.toString();

				// Message size validation
				if (msgString.length > MESSAGE_SIZE_LIMIT) {
					ws.send(JSON.stringify({
						error: 'MESSAGE_TOO_LARGE',
						message: `Message size exceeds ${MESSAGE_SIZE_LIMIT} bytes`
					}));
					return;
				}

				// Rate limiting check
				const now = Date.now();
				const rateLimitData = rateLimitMap.get(ws);

				if (rateLimitData) {
					if (now >= rateLimitData.resetTime) {
						// Reset window
						rateLimitData.count = 1;
						rateLimitData.resetTime = now + RATE_LIMIT_WINDOW_MS;
					} else if (rateLimitData.count >= RATE_LIMIT_MAX_MESSAGES) {
						// Rate limit exceeded
						ws.send(JSON.stringify({
							error: 'RATE_LIMIT_EXCEEDED',
							message: `Maximum ${RATE_LIMIT_MAX_MESSAGES} messages per second`
						}));
						console.warn(`Rate limit exceeded for user ${userId}`);
						ws.close(1008, 'RATE_LIMIT_EXCEEDED');
						return;
					} else {
						rateLimitData.count++;
					}
				} else {
					// Initialize rate limit tracking
					rateLimitMap.set(ws, {
						count: 1,
						resetTime: now + RATE_LIMIT_WINDOW_MS
					});
				}

				// JSON parsing with error handling
				let rawData: unknown;
				try {
					rawData = JSON.parse(msgString);
				} catch (parseError) {
					ws.send(JSON.stringify({
						error: 'INVALID_JSON',
						message: 'Failed to parse message as JSON'
					}));
					return;
				}

				// Schema validation with Zod
				const validationResult = WebSocketMessageSchema.safeParse(rawData);

				if (!validationResult.success) {
					ws.send(JSON.stringify({
						error: 'INVALID_MESSAGE',
						message: 'Message validation failed',
						details: validationResult.error.issues
					}));
					return;
				}

				const data: WebSocketMessage = validationResult.data;

				// Handle validated message
				if (data.type === "input") {
					const player = [...game.players].find(p => p.socket === ws);
					if (!player) return;

					game.instance.handleInput(player.playerNumber, data.direction);
				}
			} catch (error) {
				// Log unexpected errors
				console.error('WebSocket message handling error:', error);
				ws.send(JSON.stringify({
					error: 'INTERNAL_ERROR',
					message: 'Failed to process message'
				}));
			}
		});

		ws.on('close', () => {
			gameManager.removePlayer(roomId, ws);
			// Clean up rate limit tracking
			rateLimitMap.delete(ws);
		});
	}
	catch (error) {
		switch (error.code) {
			case 'ACCESS_TOKEN_MISSING':
				ws.close(1008, 'ACCESS_TOKEN_MISSING');
				break;
			case 'INVALID_ACCESS_TOKEN':
				ws.close(1008, 'INVALID_ACCESS_TOKEN');
				break;
			default:
				ws.close(1011, 'INTERNAL_SERVER_ERROR');
		}
	}
};

export default wsHandler;

import { WebSocket } from "ws";
import { FastifyRequest } from "fastify";
import { gameManager } from "src/game/GameManager.js";
import authenticateWs from '@core/utils/authenticate.ws.js'

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
			const data = JSON.parse(msg.toString());

			if (data?.type === "input") {

				const player = [...game.players].find(p => p.socket === ws);
				if (!player) return;

				game.instance.handleInput(player.playerNumber, data.direction);
			}
		});

		ws.on('close', () => {
			gameManager.removePlayer(roomId, ws);
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

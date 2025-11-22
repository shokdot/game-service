import { WebSocket } from "ws";
import { FastifyRequest } from "fastify";
import { gameManager } from "@services/game.manager.js";
import authenticateWs from '@core/utils/authenticate.ws.js'

const wsHandler = (conn: WebSocket, request: FastifyRequest) => {
	// const authResult = authenticateWs(request.headers['authorization'], conn);

	// if (authResult) return;

	// const { token } = authResult;

	const { roomId } = request.params as { roomId: string };
	const game = gameManager.getGame(roomId);
	// console.log(gameManager.listGames());
	if (!game)
		conn.close();

	if (!gameManager.addPlayer(roomId, conn))
		conn.close();

	console.log(game);

	conn.on('close', () => {
		gameManager.removePlayer(roomId, conn);
	});

};

export default wsHandler;

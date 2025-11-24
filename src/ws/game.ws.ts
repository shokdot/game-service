import { WebSocket } from "ws";
import { FastifyRequest } from "fastify";
import { gameManager } from "src/game/GameManager.js";
import authenticateWs from '@core/utils/authenticate.ws.js'

const wsHandler = (conn: WebSocket, request: FastifyRequest) => {
	try {
		const authResult = authenticateWs(request.headers['authorization'], conn);

		const { userId } = authResult;

		const { roomId } = request.params as { roomId: string };
		const game = gameManager.getGame(roomId);

		if (!game)
			conn.close();

		if (!gameManager.addPlayer(roomId, conn)) // save userId // per time interval one game user can participate
			conn.close();

		conn.on('close', () => {
			gameManager.removePlayer(roomId, conn);
		});
	}
	catch (error) {
		switch (error.code) {
			case 'ACCESS_TOKEN_MISSING':
				conn.close(1008, 'ACCESS_TOKEN_MISSING');
				break;
			case 'INVALID_ACCESS_TOKEN':
				conn.close(1008, 'INVALID_ACCESS_TOKEN');
				break;
			default:
				conn.close(1011, 'INTERNAL_SERVER_ERROR');
		}
	}
};

export default wsHandler;

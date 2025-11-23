import createGameHandler from "@controllers/createGame.controller.js";
import forceEndGameHandler from "@controllers/forceEndGame.controller.js";
import getGameState from "@controllers/getGameState.controller.js";
import wsHandler from "src/ws/game.ws.js";
import { FastifyInstance } from "fastify";

export default async function gameRoutes(app: FastifyInstance) {
	app.post('/', createGameHandler);
	app.get('/ws/:roomId', { websocket: true }, wsHandler);
	app.get('/:roomId', getGameState);
	app.delete('/:roomId', forceEndGameHandler);
};

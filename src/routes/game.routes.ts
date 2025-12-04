import createGameHandler from "@controllers/createGame.controller.js";
import forceEndGameHandler from "@controllers/forceEndGame.controller.js";
import getGameState from "@controllers/getGameState.controller.js";
import wsHandler from "src/ws/game.ws.js";
import { FastifyInstance } from "fastify";
import serviceAuth from "@core/middlewares/serviceAuth.middleware.js"

export default async function gameRoutes(app: FastifyInstance) {
	app.post('/', { preHandler: serviceAuth }, createGameHandler);
	app.get('/ws/:roomId', { websocket: true }, wsHandler);
	app.get('/:roomId', { preHandler: serviceAuth }, getGameState);
	app.delete('/:roomId', { preHandler: serviceAuth }, forceEndGameHandler);
};

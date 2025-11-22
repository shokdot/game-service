import createGameHandler from "@controllers/createGame.controller.js";
import wsHandler from "@controllers/ws.controller.js";
import { FastifyInstance } from "fastify";

export default async function gameRoutes(app: FastifyInstance) {
	app.post('/', createGameHandler);
	app.get('/ws/:roomId', { websocket: true }, wsHandler);
};

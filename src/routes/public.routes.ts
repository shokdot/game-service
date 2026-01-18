import wsHandler from "src/ws/game.ws.js";
import { FastifyInstance } from "fastify";
import { getGameStateHandler } from "@controllers/index.js";
import { external } from "@schemas/index.js";

export default async function publicRoutes(app: FastifyInstance) {
    app.get('/ws/:roomId', { websocket: true }, wsHandler);
    app.get('/:roomId', external.getGameState, getGameStateHandler);
};
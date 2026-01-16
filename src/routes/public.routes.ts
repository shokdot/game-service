import wsHandler from "src/ws/game.ws.js";
import { FastifyInstance } from "fastify";

export default async function publicRoutes(app: FastifyInstance) {
    app.get('/ws/:roomId', { websocket: true }, wsHandler);
};

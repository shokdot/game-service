import {
    createGameHandler,
    forceEndGameHandler,
} from "@controllers/index.js";
import { FastifyInstance } from "fastify";
import { internal } from "@schemas/index.js";

export default async function internalRoutes(app: FastifyInstance) {
    app.post('/', internal.createGame, createGameHandler);
    app.delete('/:roomId', internal.forceEndGame, forceEndGameHandler);
};

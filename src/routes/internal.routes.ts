import {
    createGameHandler,
    forceEndGameHandler,
    getGameStateHandler
} from "@controllers/index.js";
import { FastifyInstance } from "fastify";
import serviceAuth from "@core/middlewares/serviceAuth.middleware.js"

//schemas

export default async function internalRoutes(app: FastifyInstance) {
    app.post('/', { preHandler: serviceAuth }, createGameHandler);
    app.get('/:roomId', { preHandler: serviceAuth }, getGameStateHandler);
    app.delete('/:roomId', { preHandler: serviceAuth }, forceEndGameHandler);
};

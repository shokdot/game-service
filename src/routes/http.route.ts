import { createGame } from "@controllers/http/index.js";
import { FastifyInstance } from "fastify";

const httpRoutes = async (app: FastifyInstance) => {
	app.post('/', createGame);
};

export default httpRoutes;

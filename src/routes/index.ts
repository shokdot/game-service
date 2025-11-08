import { FastifyInstance } from "fastify";
import httpRoutes from "./http.route.js";
import wsRoutes from "./ws.route.js";

export default async function gameRoutes(app: FastifyInstance) {
	app.register(httpRoutes);
	app.register(wsRoutes, { prefix: '/ws' });
};

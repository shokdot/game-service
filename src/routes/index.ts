import { FastifyInstance } from "fastify";
import internalRoutes from "./internal.routes.js";
import publicRoutes from "./public.routes.js";

export default async function gameRoutes(app: FastifyInstance) {
    app.register(publicRoutes);
    app.register(internalRoutes, { prefix: '/internal' });
};

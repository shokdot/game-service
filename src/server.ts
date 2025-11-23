import 'dotenv/config'
import { FastifyInstance } from 'fastify';
import { buildApp, startServer, API_PREFIX } from '@core/index.js';
import { PORT, HOST, SERVICE_NAME } from './utils/env.js';
import healthRoutes from '@core/routes/health.routes.js';
import gameRoutes from 'src/routes/game.routes.js';
import ws from "@fastify/websocket";

const app: FastifyInstance = buildApp(SERVICE_NAME);
app.register(ws);

async function registerRoutes(app: FastifyInstance) {
	await app.register(healthRoutes, { prefix: `${API_PREFIX}/games` });
	await app.register(gameRoutes, { prefix: `${API_PREFIX}/games` });
}

startServer(app, registerRoutes, HOST, PORT);

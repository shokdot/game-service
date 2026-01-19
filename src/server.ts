import 'dotenv/config'
import { FastifyInstance } from 'fastify';
import { buildApp, startServer, API_PREFIX } from '@core/index.js';
import { PORT, HOST, SERVICE_NAME } from './utils/env.js';
import { gameManager } from 'src/game/GameManager.js';
import healthRoutes from '@core/routes/health.routes.js';
import gameRoutes from 'src/routes/index.js';
import ws from "@fastify/websocket";

const app: FastifyInstance = buildApp(SERVICE_NAME);
app.register(ws);

app.addHook('onClose', async () => {
    await gameManager.forceCleanup();
});

const heartbeatInterval = setInterval(() => {
    const games = gameManager.listGames();
    games.forEach(roomId => {
        const game = gameManager.getGame(roomId);
        if (game) {
            game.players.forEach(player => {
                const ws = player.socket as any;
                if (player.socket.readyState === WebSocket.OPEN) {
                    if (ws.isAlive === false) {
                        player.socket.terminate();
                        return;
                    }
                    ws.isAlive = false;
                    player.socket.ping();
                } else {
                    player.socket.terminate();
                }
            });
        }
    });
}, 30000);

async function registerRoutes(app: FastifyInstance) {
    await app.register(healthRoutes, { prefix: `${API_PREFIX}/games` });
    await app.register(gameRoutes, { prefix: `${API_PREFIX}/games` });
}

startServer(app, registerRoutes, HOST, PORT, SERVICE_NAME);

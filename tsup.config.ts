import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/server.ts'],
    format: ['esm'],
    target: 'es2022',
    outDir: 'dist',
    external: [
        'fastify-metrics',
        'pino',
        'fastify',
        '@fastify/cookie',
        '@fastify/cors',
        '@fastify/helmet',
        '@fastify/rate-limit',
        '@fastify/swagger',
        '@fastify/swagger-ui',
        '@fastify/websocket',
        '@prisma/client',
        'axios',
        'dotenv',
        'jsonwebtoken',
        'ws',
        'zod'
    ],
    noExternal: ['@core'],
});

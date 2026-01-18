FROM node:20 AS builder

WORKDIR /apps

COPY core/package*.json core/
COPY core/tsconfig.json core/
COPY core/src core/src

WORKDIR /apps/core
RUN npm install && npm run build

WORKDIR /apps

COPY game-service/package*.json game-service/
COPY game-service/tsconfig.json game-service/
COPY game-service/tsup.config.ts game-service/
COPY game-service/src game-service/src

WORKDIR /apps/game-service

RUN npm install
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /apps

COPY --from=builder /apps/core/dist core/dist
COPY --from=builder /apps/game-service/dist game-service/dist
COPY --from=builder /apps/game-service/package*.json game-service/

WORKDIR /apps/game-service

RUN npm install --omit=dev

EXPOSE 3000

CMD ["npm", "run", "start"]

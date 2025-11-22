import { gameManager } from "@services/game.manager.js";
import { FastifyReply, FastifyRequest } from "fastify";

const forceEndGame = (request: FastifyRequest, reply: FastifyReply) => {
	// const { roomId } = request.params as { roomId: string };
	// const ended = gameManager.endGame(roomId);
	// if (!ended) return reply.status(404).send({ error: 'Game not found' });

	// reply.send({ success: true, message: `Game for room ${roomId} ended` });
};

export default forceEndGame;

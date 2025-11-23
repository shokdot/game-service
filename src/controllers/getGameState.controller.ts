import { FastifyReply, FastifyRequest } from "fastify";

const getGameState = (request: FastifyRequest, reply: FastifyReply) => {
	// const { roomId } = request.params as { roomId: string };
	// const game = gameManager.getGame(roomId);
	// if (!game) return reply.status(404).send({ error: 'Game not found' });

	// reply.send({ roomId, state: game.getState() });
};

export default getGameState;

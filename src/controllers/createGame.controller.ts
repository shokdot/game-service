import { createGame } from "@services/index.js";
import { FastifyReply, FastifyRequest } from "fastify";

const createGameHandler = async (request: FastifyRequest, reply: FastifyReply) => {
	try {
		const { roomId } = request.body as { roomId: string }; // refactor

		createGame(roomId);

		reply.send({ // refactor it
			success: true,
			message: `Game created for room: ${roomId}`,
			roomId: roomId,
		});

	} catch (error) {
		console.error('[createGameRoom]', error);
		reply.status(500).send({ error: 'Failed to create game' });
	}
};

export default createGameHandler;

import { sendError, AppError } from "@core/index.js";
import { createGame } from "@services/index.js";
import { FastifyReply, FastifyRequest } from "fastify";
import { CreateGameDTO } from "src/dto/create-game.dto.js";

const createGameHandler = async (request: FastifyRequest<{ Body: CreateGameDTO }>, reply: FastifyReply) => {
	try {
		const { roomId, userIds, winScore = 11 } = request.body;

		createGame(roomId, userIds, winScore);

		return reply.status(200).send({
			status: 'success',
			data: { roomId },
			message: `Game created for room: ${roomId}`,
		});

	} catch (error: any) {
		if (error instanceof AppError) {
			return sendError(reply, error);
		}
		return sendError(reply, 500, 'INTERNAL_SERVER_ERROR', 'Internal server error');
	}
};

export default createGameHandler;

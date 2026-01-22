import { FastifyReply, FastifyRequest } from "fastify";
import { roomByIdDTO } from "src/dto/room-by-id.dto.js";
import { sendError, AppError } from "@core/index.js";
import getGameState from "@services/getGameState.service.js";

const getGameStateHandler = (request: FastifyRequest<{ Params: roomByIdDTO }>, reply: FastifyReply) => {
	try {
		const { roomId } = request.params;

		const data = getGameState(roomId);

		return reply.status(200).send({
			status: 'success',
			data,
			message: 'Game state retrieved'
		});

	} catch (error: any) {
		if (error instanceof AppError) {
			return sendError(reply, error);
		}
		return sendError(reply, 500, 'INTERNAL_SERVER_ERROR', 'Internal server error');
	}
};

export default getGameStateHandler;

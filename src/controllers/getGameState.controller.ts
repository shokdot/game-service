import { FastifyReply, FastifyRequest } from "fastify";
import { roomByIdDTO } from "src/dto/room-by-id.dto.js";
import { sendError } from "@core/index.js";
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

	} catch (error) {
		switch (error.code) {
			case 'GAME_NOT_FOUND':
				return sendError(reply, 404, error.code, 'The requested game was not found.');
			default:
				return sendError(reply, 500, 'INTERNAL_SERVER_ERROR', 'Internal server error');
		}
	}
};

export default getGameStateHandler;

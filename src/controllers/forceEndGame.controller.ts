import { FastifyReply, FastifyRequest } from "fastify";
import { forceEndGame } from "@services/index.js";
import { sendError } from "@core/index.js";
import { roomByIdDTO } from "src/dto/room-by-id.dto.js";

const forceEndGameHandler = (request: FastifyRequest<{ Params: roomByIdDTO }>, reply: FastifyReply) => {
	try {

		const { roomId } = request.params;

		forceEndGame(roomId);

		return reply.status(200).send({
			status: 'success',
			message: 'Game has been forcefully ended.'
		});

	}
	catch (error: any) {
		switch (error.code) {
			case 'GAME_NOT_FOUND':
				return sendError(reply, 404, error.code, 'The requested game was not found.');
			case 'UNHANDLED_ERROR':
				return sendError(reply, 500, error.code, 'An unexpected error occurred.');
			default:
				return sendError(reply, 500, 'INTERNAL_SERVER_ERROR', 'Internal server error');
		}
	}
};

export default forceEndGameHandler;

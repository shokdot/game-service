import { sendError } from "@core/index.js";
import { createGame } from "@services/index.js";
import { FastifyReply, FastifyRequest } from "fastify";
import { roomByIdDTO } from "src/dto/room-by-id.dto.js";

const createGameHandler = async (request: FastifyRequest<{ Body: roomByIdDTO }>, reply: FastifyReply) => {
	try {
		const { roomId } = request.body;

		createGame(roomId);

		return reply.status(200).send({
			status: 'success',
			data: { roomId },
			message: `Game created for room: ${roomId}`,
		});

	} catch (error) {
		switch (error.code) {
			case "GAME_ALREADY_EXISTS":
				return sendError(reply, 404, error.code, "A game with this ID already exists.'");
			default:
				return sendError(reply, 500, 'INTERNAL_SERVER_ERROR', 'Internal server error');
		}
	}
};

export default createGameHandler;

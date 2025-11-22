import { FastifyReply, FastifyRequest } from "fastify";
import forceEndGame from "@services/forceEndGame.service.js";

const forceEndGameHandler = (request: FastifyRequest, reply: FastifyReply) => {
	try {

		const { roomId } = request.params as { roomId: string };

		forceEndGame(roomId);

		reply.send({ success: true, message: `Game for room ${roomId} ended` }); //ref

	}
	catch (error: any) {
		reply.status(500).send({ error: 'smth' }); //refactor it

	}

};

export default forceEndGameHandler;

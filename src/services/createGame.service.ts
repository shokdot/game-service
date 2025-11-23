import { gameManager } from "src/game/GameManager.js";

const createGame = (roomId: string) => {
	if (!roomId) {
		// return reply.status(400).send({ error: 'roomId is required' });
	}
	const existing = gameManager.getGame(roomId);
	if (existing) {
		// return reply.status(400).send({ error: `Game already exists for roomId: ${roomId}` });
	}

	gameManager.createGame(roomId);
};

export default createGame;

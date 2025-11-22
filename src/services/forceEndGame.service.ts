import { gameManager } from "./game.manager.js";


const forceEndGame = (roomId: string) => {
	const ended = gameManager.endGame(roomId);
	if (!ended) {

		// return reply.status(404).send({ error: 'Game not found' });
	}

};

export default forceEndGame;

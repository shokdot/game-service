import { gameManager } from "../game/GameManager.js";


const forceEndGame = (roomId: string) => {
	const ended = gameManager.endGame(roomId);
	if (!ended) {

		// return reply.status(404).send({ error: 'Game not found' });
	}

};

export default forceEndGame;

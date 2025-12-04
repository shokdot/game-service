import { AppError } from "@core/utils/AppError.js";
import { gameManager } from "../game/GameManager.js";


const forceEndGame = (roomId: string) => {
	if (!gameManager.getGame(roomId))
		throw new AppError('GAME_NOT_FOUND');
	const ended = gameManager.endGame(roomId);
	if (!ended) {
		throw new AppError('UNHANDELED_ERROR');
	}
};

export default forceEndGame;

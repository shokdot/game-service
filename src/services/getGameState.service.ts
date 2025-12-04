import { AppError } from "@core/utils/AppError.js";
import { gameManager } from "src/game/GameManager.js";

const getGameState = (roomId: string) => {
	const game = gameManager.getGame(roomId);
	if (!game)
		throw new AppError('GAME_NOT_FOUND');
	const data = game.instance.getState();
	return data;
};

export default getGameState;

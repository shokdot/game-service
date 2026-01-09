import { AppError } from "@core/utils/AppError.js";
import { gameManager } from "src/game/GameManager.js";

const createGame = (roomId: string, winScore?: number) => {
    const existing = gameManager.getGame(roomId);

    if (existing) {
        throw new AppError('GAME_ALREADY_EXISTS');
    }

    gameManager.createGame(roomId, winScore);
};

export default createGame;

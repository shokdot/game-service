import createGameSchema from "./createGame.schema.js";
import forceEndGameSchema from "./forceEndGame.schema.js";
import getGameStateSchema from "./getGameState.schema.js";

export const internal = {
    createGame: createGameSchema,
    forceEndGame: forceEndGameSchema
}

export const external = {
    getGameState: getGameStateSchema
}

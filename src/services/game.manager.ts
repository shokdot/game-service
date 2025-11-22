import { GameInstance } from 'src/engine/game.instance.js';
import { WebSocket } from "ws";

export class GameManager {
	private games = new Map<string, {
		instance: GameInstance,
		players: Set<WebSocket> // WS clients
	}>();

	/** Create and register a new game instance for a room */
	public createGame(roomId: string) {
		if (this.games.has(roomId)) {
			throw new Error(`Game already exists for room: ${roomId}`);
		}

		const instance = new GameInstance((state) => {
			this.broadcast(roomId, {
				type: "state",
				state
			});
		});

		this.games.set(roomId, {
			instance,
			players: new Set()
		});

		return this.games.get(roomId);
	}

	/** Get a running game instance by roomId */
	public getGame(roomId: string) {
		return this.games.get(roomId);
	}

	private broadcast(roomId: string, data: any) {
		const game = this.getGame(roomId);
		if (!game) return;

		const json = JSON.stringify(data);

		for (const player of game.players) {
			if (player.readyState === WebSocket.OPEN) {
				player.send(json);
			}
		}
	}

	public addPlayer(roomId: string, player: WebSocket): boolean {
		const game = this.getGame(roomId);
		if (!game) return false;

		if (game.players.size >= 2) return false;

		game.players.add(player);

		if (game.players.size === 2 && !game.instance.isRunning()) {
			game.instance.start();
		}

		return true;
	}

	public removePlayer(roomId: string, player: WebSocket) {
		const game = this.getGame(roomId);
		if (!game) return false;

		game.players.delete(player);

		try { player.close(); } catch { }

		if (game.players.size < 2 && game.instance.isRunning()) {
			game.instance.stop();
		}

		if (game.players.size === 0) {
			this.games.delete(roomId);
			return true;
		}

		for (const p of game.players) {
			if (p.readyState === WebSocket.OPEN) {
				p.send(JSON.stringify({ type: "opponent_left" }));
			}
		}

		return true;
	}

	public endGame(roomId: string): boolean {

		const game = this.getGame(roomId);
		if (!game) return false;

		if (game.instance.isRunning()) {
			game.instance.stop();
		}

		for (const player of game.players) {
			try {
				if (player.readyState === WebSocket.OPEN) {
					player.send(JSON.stringify({ type: "game_end" }));
				}
				player.close();
			} catch { }
		}

		// Remove the game from manager
		this.games.delete(roomId);

		return true;

	}

	// /** Return all active games (for debugging/admin) */
	listGames(): string[] {
		return Array.from(this.games.keys());
	}

	/** Clear all games — use only in shutdown or tests */
	// clearAll(): void {
	// 	for (const [roomId, game] of this.games) {
	// 		game.stop?.();
	// 		this.games.delete(roomId);
	// 	}
	// 	console.log(`[GameManager] All games cleared`);
	// }
}

/** Singleton instance (used across controllers/services) */
export const gameManager = new GameManager();

import { GameInstance } from 'src/game/GameInstance.js';
import { WebSocket } from "ws";
import { GameResult, Player } from './types.js'
import { SERVICE_TOKEN, ROOM_SERVICE_URL, USER_SERVICE_URL } from 'src/utils/env.js';
import axios from 'axios';
import { AppError } from '@core/index.js';

const COUNTDOWN_SECONDS = 3;

export class GameManager {
	private games = new Map<string, {
		instance: GameInstance,
		players: Set<Player>,
		allowedUserIds: Set<string>,
		countdownTimer?: NodeJS.Timeout
	}>();

	public createGame(roomId: string, userIds: string[], winScore?: number) {
		if (this.games.has(roomId)) {
			throw new Error(`Game already exists for room: ${roomId}`);
		}

		const instance = new GameInstance(
			(state) => {
				this.broadcast(roomId, { type: "state", state });
			},
			(result) => {
				const game = this.getGame(roomId);
				if (game) {
					for (const player of game.players) {
						if (player.socket.readyState === WebSocket.OPEN) {
							const type = player.playerNumber === result.winner ? "you_win" : "you_lose";
							player.socket.send(JSON.stringify({
								type,
								result
							}));
						}
					}
				}
				this.endGame(roomId, result);
			},
			winScore
		);

		this.games.set(roomId, {
			instance,
			players: new Set(),
			allowedUserIds: new Set(userIds)
		});

		// Timeout to clean up if nobody connects
		setTimeout(() => {
			const current = this.games.get(roomId);
			if (current && current.players.size === 0) {
				this.games.delete(roomId);
				for (const uid of userIds) {
					this.notifyRoomServiceLeave(roomId, uid);
					this.updateUserStatus(uid, 'ONLINE').catch(console.error);
				}
			}
		}, 15000);

		return this.games.get(roomId);
	}

	public getGame(roomId: string) {
		return this.games.get(roomId);
	}

	private broadcast(roomId: string, data: any) {
		const game = this.getGame(roomId);
		if (!game) return;

		const json = JSON.stringify(data);

		for (const player of game.players) {
			if (player.socket.readyState === WebSocket.OPEN) {
				player.socket.send(json);
			}
		}
	}

	public addPlayer(roomId: string, userId: string, socket: WebSocket): boolean {
		const game = this.getGame(roomId);
		if (!game) return false;

		if (!game.allowedUserIds.has(userId)) {
			throw new AppError('USER_NOT_ALLOWED');
		}

		// Check if player is reconnecting
		for (const p of game.players) {
			if (p.userId === userId) {
				if (p.reconnectTimer) {
					clearTimeout(p.reconnectTimer);
					p.reconnectTimer = undefined;
				}
				// Proactively close old socket
				try {
					if (p.socket !== socket) {
						p.socket.close(1000, 'Reconnected from other location');
					}
				} catch { }

				p.socket = socket;
				p.isConnected = true;

				// Notify player of current state (include playerNumber so client can restore perspective)
				socket.send(JSON.stringify({ type: "reconnected", state: game.instance.getState(), playerNumber: p.playerNumber, players: [...game.allowedUserIds] }));

				// Resume game with countdown if both are connected
				if (game.players.size === 2 && [...game.players].every(player => player.isConnected) && !game.instance.isRunning()) {
					this.broadcast(roomId, { type: "game_resumed" });
					this.startCountdown(roomId);
				}
				return true;
			}
		}

		if (game.players.size >= 2) {
			throw new AppError('ROOM_FULL');
		}

		const playerNumber = game.players.size === 0 ? 1 : 2;

		const player: Player = {
			userId,
			socket,
			playerNumber,
			isConnected: true
		};

		game.players.add(player);

		// Tell the client which player number they are (include all player userIds)
		if (socket.readyState === WebSocket.OPEN) {
			socket.send(JSON.stringify({ type: "player_assignment", playerNumber, players: [...game.allowedUserIds] }));
		}

		if (game.players.size === 2 && !game.instance.isRunning()) {
			this.startCountdown(roomId);
			// Update status for both players
			for (const p of game.players) {
				this.updateUserStatus(p.userId, 'IN_GAME').catch(console.error);
			}
		}

		return true;
	}

	private startCountdown(roomId: string): void {
		const game = this.getGame(roomId);
		if (!game) return;

		// Cancel any existing countdown
		if (game.countdownTimer) {
			clearInterval(game.countdownTimer);
		}

		let count = COUNTDOWN_SECONDS;
		this.broadcast(roomId, { type: "countdown", count });

		game.countdownTimer = setInterval(() => {
			count--;
			if (count > 0) {
				this.broadcast(roomId, { type: "countdown", count });
			} else {
				clearInterval(game.countdownTimer!);
				game.countdownTimer = undefined;

				// Verify both players are still connected before starting
				const allConnected = game.players.size === 2
					&& [...game.players].every(p => p.isConnected);

				if (allConnected && !game.instance.isRunning()) {
					game.instance.start();
				}
			}
		}, 1000);
	}

	public handleDisconnect(roomId: string, socket: WebSocket) {
		const game = this.getGame(roomId);
		if (!game) return;

		let disconnectedPlayer: Player | null = null;
		for (const p of game.players) {
			if (p.socket === socket) {
				disconnectedPlayer = p;
				break;
			}
		}

		if (!disconnectedPlayer || !disconnectedPlayer.isConnected) return;

		disconnectedPlayer.isConnected = false;

		// Cancel any running countdown
		if (game.countdownTimer) {
			clearInterval(game.countdownTimer);
			game.countdownTimer = undefined;
		}

		// Pause game
		if (game.instance.isRunning()) {
			game.instance.stop();
		}

		this.broadcast(roomId, { type: "opponent_disconnected", userId: disconnectedPlayer.userId });

		// Start reconnection timer
		disconnectedPlayer.reconnectTimer = setTimeout(() => {
			this.removePlayer(roomId, socket, true);
		}, 30000); // 30 seconds
	}

	public async removePlayer(roomId: string, socket: WebSocket, isTimeout = false) {
		const game = this.getGame(roomId);
		if (!game) return false;

		let removedPlayer: Player | null = null;

		for (const p of game.players) {
			if (p.socket === socket) {
				removedPlayer = p;
				break;
			}
		}

		if (!removedPlayer) return false;

		if (removedPlayer.reconnectTimer && !isTimeout) {
			clearTimeout(removedPlayer.reconnectTimer);
		}

		game.players.delete(removedPlayer);

		try { socket.close(); } catch { }

		// Await room-service leave so the room is cleaned up before the user
		// can navigate away and send a new invite (fixes re-invite failure).
		await this.notifyRoomServiceLeave(roomId, removedPlayer.userId);
		this.updateUserStatus(removedPlayer.userId, 'ONLINE').catch(console.error);

		if (game.players.size === 0) {
			// All connected players gone – also remove any allowed users who never
			// connected so the room-service room is fully cleaned up.
			for (const uid of game.allowedUserIds) {
				if (uid !== removedPlayer.userId) {
					await this.notifyRoomServiceLeave(roomId, uid);
				}
			}
			this.games.delete(roomId);
			return true;
		}

		// Player explicitly left — notify opponent but do NOT declare
		// a winner and do NOT save match results.
		const remaining = [...game.players][0];
		if (remaining && remaining.socket.readyState === WebSocket.OPEN) {
			remaining.socket.send(JSON.stringify({ type: "opponent_left", userId: removedPlayer.userId }));
		}

		// Clean up the game inline instead of calling endGame(), so we do NOT
		// close the remaining player's socket.
		if (game.countdownTimer) {
			clearInterval(game.countdownTimer);
			game.countdownTimer = undefined;
		}
		if (game.instance.isRunning()) {
			game.instance.stop();
		}

		// Clear any reconnect timers on the remaining player
		for (const player of game.players) {
			if (player.reconnectTimer) {
				clearTimeout(player.reconnectTimer);
				player.reconnectTimer = undefined;
			}
		}

		// Clean up room-service for all remaining players (no match result saved)
		for (const player of game.players) {
			await this.notifyRoomServiceLeave(roomId, player.userId);
			this.updateUserStatus(player.userId, 'ONLINE').catch(console.error);
		}

		this.games.delete(roomId);

		return true;
	}

	public endGame(roomId: string, result?: GameResult, explicitPlayers?: Player[]): boolean {

		const game = this.getGame(roomId);
		if (!game) return false;

		if (game.countdownTimer) {
			clearInterval(game.countdownTimer);
			game.countdownTimer = undefined;
		}

		if (game.instance.isRunning()) {
			game.instance.stop();
		}

		for (const player of game.players) {
			if (player.reconnectTimer) {
				clearTimeout(player.reconnectTimer);
				player.reconnectTimer = undefined;
			}
			try {
				if (player.socket.readyState === WebSocket.OPEN) {
					player.socket.send(JSON.stringify({ type: "game_end" }));
				}
				player.socket.close();
			} catch { }
		}

		const playersToNotify = explicitPlayers || Array.from(game.players);
		this.games.delete(roomId);

		this.notifyRoomServiceFinish(roomId, playersToNotify, result);

		for (const player of playersToNotify) {
			this.updateUserStatus(player.userId, 'ONLINE').catch(console.error);
		}

		return true;
	}

	private async notifyRoomServiceLeave(roomId: string, userId: string) {
		try {
			const url = `${ROOM_SERVICE_URL}/internal/${roomId}/leave`;

			await axios.post(url, {
				userId
			}, {
				headers: {
					'Content-Type': 'application/json',
					'x-service-token': SERVICE_TOKEN
				}
			});

		} catch (error) {
			console.error('Failed to notify room service (leave):', error);
		}
	}

	private async notifyRoomServiceFinish(roomId: string, players: Player[], result?: GameResult) {
		try {
			const url = `${ROOM_SERVICE_URL}/internal/${roomId}/finish`;

			// Room-service expects winner/playerNumber as 0 or 1; game uses 1 or 2
			const winnerIndex = result?.winner != null ? result.winner - 1 : undefined;
			await axios.post(url, {
				winner: winnerIndex,
				finalScore: result?.finalScore,
				gameDuration: result?.gameDuration,
				startTime: result?.startTime,
				endTime: result?.endTime,
				players: players.map(p => ({
					userId: p.userId,
					playerNumber: p.playerNumber - 1
				}))
			}, {
				headers: {
					'Content-Type': 'application/json',
					'x-service-token': SERVICE_TOKEN
				}
			});

		} catch (error) {
			console.error('Failed to notify room service (finish):', error);
		}
	}

	private async updateUserStatus(userId: string, status: 'ONLINE' | 'OFFLINE' | 'IN_GAME') {
		try {
			const url = `${USER_SERVICE_URL}/internal/${userId}/status`;

			await axios.patch(url, {
				status
			}, {
				headers: {
					'Content-Type': 'application/json',
					'x-service-token': SERVICE_TOKEN
				}
			});
		} catch (error) {
			console.error(`Failed to update status for user ${userId}:`, error);
		}
	}

	public listGames(): string[] {
		return Array.from(this.games.keys());
	}

	public forceCleanup(): void {
		try {
			for (const [, game] of this.games) {
				if (game.countdownTimer) {
					clearInterval(game.countdownTimer);
				}
				if (game.instance.isRunning()) {
					game.instance.stop();
				}
				for (const player of game.players) {
					try {
						player.socket.close(1001, 'Server shutting down');
					} catch { }
				}
			}
			this.games.clear();
		} catch { }
	}

}

export const gameManager = new GameManager();

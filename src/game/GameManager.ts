import { GameInstance } from 'src/game/GameInstance.js';
import { WebSocket } from "ws";
import { GameResult, Player } from './types.js'
import { SERVICE_TOKEN, ROOM_SERVICE_URL, USER_SERVICE_URL } from 'src/utils/env.js';
import axios from 'axios';
import { AppError } from '@core/index.js';

export class GameManager {
    private games = new Map<string, {
        instance: GameInstance,
        players: Set<Player>,
        allowedUserIds: Set<string>
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

                // Notify player of current state
                socket.send(JSON.stringify({ type: "reconnected", state: game.instance.getState() }));

                // Resume game if both are connected and there are exactly 2 players
                if (game.players.size === 2 && [...game.players].every(player => player.isConnected) && !game.instance.isRunning()) {
                    game.instance.start();
                    this.broadcast(roomId, { type: "game_resumed" });
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

        if (game.players.size === 2 && !game.instance.isRunning()) {
            game.instance.start();
            // Update status for both players
            for (const p of game.players) {
                this.updateUserStatus(p.userId, 'IN_GAME').catch(console.error);
            }
        }

        return true;
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

    public removePlayer(roomId: string, socket: WebSocket, isTimeout = false) {
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

        this.notifyRoomServiceLeave(roomId, removedPlayer.userId);
        this.updateUserStatus(removedPlayer.userId, 'ONLINE').catch(console.error);

        if (game.players.size === 0) {
            this.games.delete(roomId);
            return true;
        }

        // If one remains, declare them winner or end game since other didn't return
        const winner = [...game.players][0];
        if (winner && winner.socket.readyState === WebSocket.OPEN) {
            winner.socket.send(JSON.stringify({ type: "opponent_left_permanently" }));
        }

        this.endGame(roomId);

        return true;
    }

    public endGame(roomId: string, result?: GameResult): boolean {

        const game = this.getGame(roomId);
        if (!game) return false;

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

        const players = Array.from(game.players);
        this.games.delete(roomId);

        this.notifyRoomServiceFinish(roomId, players, result);

        for (const player of game.players) {
            this.updateUserStatus(player.userId, 'ONLINE').catch(console.error);
        }

        return true;
    }

    private async notifyRoomServiceLeave(roomId: string, userId: string) {
        try {
            const url = `${ROOM_SERVICE_URL}/${roomId}/internal/leave`;

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
            const url = `${ROOM_SERVICE_URL}/${roomId}/internal/finish`;

            await axios.post(url, {
                winner: result?.winner,
                finalScore: result?.finalScore,
                gameDuration: result?.gameDuration,
                startTime: result?.startTime,
                endTime: result?.endTime,
                players: players.map(p => ({
                    userId: p.userId,
                    playerNumber: p.playerNumber
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

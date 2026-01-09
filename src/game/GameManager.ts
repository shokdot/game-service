import { GameInstance } from 'src/game/GameInstance.js';
import { WebSocket } from "ws";
import { Player } from './types.js'

export class GameManager {
    private games = new Map<string, {
        instance: GameInstance,
        players: Set<Player>
    }>();

    public createGame(roomId: string, winScore?: number) {
        if (this.games.has(roomId)) {
            throw new Error(`Game already exists for room: ${roomId}`);
        }

        const instance = new GameInstance(
            (state) => {
                this.broadcast(roomId, { type: "state", state });
            },
            (winner) => {
                this.broadcast(roomId, { type: "game_end", winner });
                this.endGame(roomId);
            },
            winScore
        );

        this.games.set(roomId, {
            instance,
            players: new Set()
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

        if (game.players.size >= 2) return false;

        for (const p of game.players) {
            if (p.userId === userId) return false;
        }

        const playerNumber = game.players.size === 0 ? 1 : 2;

        const player: Player = {
            userId,
            socket,
            playerNumber
        };

        game.players.add(player);

        if (game.players.size === 2 && !game.instance.isRunning()) {
            game.instance.start();
        }

        return true;
    }

    public removePlayer(roomId: string, socket: WebSocket) {
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

        game.players.delete(removedPlayer);

        try { socket.close(); } catch { }

        if (game.players.size < 2 && game.instance.isRunning()) {
            game.instance.stop();
        }

        if (game.players.size === 0) {
            this.games.delete(roomId);
            return true;
        }

        for (const p of game.players) {
            if (p.socket.readyState === WebSocket.OPEN) {
                p.socket.send(JSON.stringify({ type: "opponent_left" }));
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
                if (player.socket.readyState === WebSocket.OPEN) {
                    player.socket.send(JSON.stringify({ type: "game_end" }));
                }
                player.socket.close();
            } catch { }
        }

        this.games.delete(roomId);

        return true;
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

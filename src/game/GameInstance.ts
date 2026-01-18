import {
    GAME_WIDTH,
    GAME_HEIGHT,
    PADDLE_HEIGHT,
    PADDLE_WIDTH,
    BALL_SIZE,
    BALL_SPEED,
    PADDLE_SPEED,
    TICK_RATE,
    WIN_SCORE
} from './constants.js'
import { GameResult, GameState } from "src/game/types.js";

export class GameInstance {
    private state: GameState;
    private running = false;
    private interval: NodeJS.Timeout | null = null;
    private onUpdate?: (state: GameState) => void;
    private onGameEnd?: (result: GameResult) => void;
    private winScore: number;
    private startTime?: Date;

    constructor(
        onUpdate?: (state: GameState) => void,
        onGameEnd?: (result: GameResult) => void,
        winScore: number = WIN_SCORE
    ) {
        this.state = this.createInitialState();
        this.onUpdate = onUpdate;
        this.onGameEnd = onGameEnd;
        this.winScore = winScore;
    }

    private createInitialState(): GameState {
        return {
            ball: {
                x: GAME_WIDTH / 2,
                y: GAME_HEIGHT / 2,
                vx: BALL_SPEED * this.randomDirection(),
                vy: BALL_SPEED * this.randomDirection()
            },
            paddle1: { y: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2, moving: 0 },
            paddle2: { y: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2, moving: 0 },
            score: { player1: 0, player2: 0 }
        };
    }

    public start(): void {
        if (this.running) return;
        this.running = true;
        this.startTime = new Date();

        this.interval = setInterval(() => {
            this.update();
            if (this.onUpdate) this.onUpdate(this.state);
        }, TICK_RATE);
    }

    public stop(): void {
        if (!this.running) return;
        this.running = false;

        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    public handleInput(player: 1 | 2, direction: number): void {
        if (Math.abs(direction) > 1) return;
        const paddleKey = player === 1 ? "paddle1" : "paddle2";
        this.state[paddleKey].moving = direction;
    }

    public getState(): GameState {
        return this.state;
    }

    public isRunning(): boolean {
        return this.running;
    }

    private update(): void {
        if (!this.running) return;

        const { ball, paddle1, paddle2, score } = this.state;

        this.updatePaddle(paddle1);
        this.updatePaddle(paddle2);
        this.updateBall(ball, paddle1, paddle2, score);
    }

    private updatePaddle(paddle: { y: number; moving: number }) {
        paddle.y += paddle.moving * PADDLE_SPEED;
        paddle.y = Math.max(0, Math.min(GAME_HEIGHT - PADDLE_HEIGHT, paddle.y));
    }

    private updateBall(
        ball: { x: number; y: number; vx: number; vy: number },
        p1: { y: number },
        p2: { y: number },
        score: { player1: number; player2: number }
    ) {
        ball.x += ball.vx;
        ball.y += ball.vy;

        if (ball.y <= 0 || ball.y >= GAME_HEIGHT - BALL_SIZE) {
            ball.vy *= -1;
        }

        if (ball.x <= PADDLE_WIDTH && this.collides(ball.y, p1.y)) {
            ball.vx = Math.abs(ball.vx);
            this.addRandomSpin(ball);
        }

        if (ball.x >= GAME_WIDTH - PADDLE_WIDTH - BALL_SIZE && this.collides(ball.y, p2.y)) {
            ball.vx = -Math.abs(ball.vx);
            this.addRandomSpin(ball);
        }

        if (ball.x < 0) {
            score.player2++;
            if (score.player2 >= this.winScore) {
                this.stop();
                this.triggerGameEnd(2);
                return;
            }
            this.resetBall();
        }
        else if (ball.x > GAME_WIDTH) {
            score.player1++;
            if (score.player1 >= this.winScore) {
                this.stop();
                this.triggerGameEnd(1);
            }
            this.resetBall();
        }
    }

    private collides(ballY: number, paddleY: number): boolean {
        return ballY + BALL_SIZE >= paddleY && ballY <= paddleY + PADDLE_HEIGHT;
    }

    private addRandomSpin(ball: { vy: number }) {
        ball.vy += (Math.random() - 0.5) * 2;
    }

    private resetBall(): void {
        this.state.ball = {
            x: GAME_WIDTH / 2,
            y: GAME_HEIGHT / 2,
            vx: BALL_SPEED * this.randomDirection(),
            vy: BALL_SPEED * this.randomDirection()
        };
    }

    private randomDirection(): number {
        return Math.random() > 0.5 ? 1 : -1;
    }

    private triggerGameEnd(winner: 1 | 2): void {
        if (!this.onGameEnd || !this.startTime) return;

        const endTime = new Date();
        const result: GameResult = {
            winner,
            finalScore: {
                player1: this.state.score.player1,
                player2: this.state.score.player2
            },
            gameDuration: endTime.getTime() - this.startTime.getTime(),
            startTime: this.startTime,
            endTime
        };

        this.onGameEnd(result);
    }
}

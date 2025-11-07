import { GameState } from "src/types/game.js";

// Game constants
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;
export const PADDLE_HEIGHT = 100;
export const PADDLE_WIDTH = 10;
export const BALL_SIZE = 10;
export const BALL_SPEED = 5;
export const PADDLE_SPEED = 8;

export type GameStateCallback = (state: GameState) => void;

export class Game {
	private state: GameState;
	private running: boolean;
	private interval: NodeJS.Timeout | null;
	private onStateUpdate: GameStateCallback;

	constructor(onStateUpdate: GameStateCallback) {
		this.onStateUpdate = onStateUpdate;
		this.state = {
			ball: {
				x: GAME_WIDTH / 2,
				y: GAME_HEIGHT / 2,
				vx: BALL_SPEED,
				vy: BALL_SPEED
			},
			paddle1: { y: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2, moving: 0 },
			paddle2: { y: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2, moving: 0 },
			score: { player1: 0, player2: 0 }
		};
		this.running = false;
		this.interval = null;
	}

	public start(): void {
		if (this.running) return;

		this.running = true;
		this.interval = setInterval(() => {
			this.update();
			this.onStateUpdate(this.state);
		}, 1000 / 60);
	}

	public stop(): void {
		this.running = false;
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
		}
	}

	public handleInput(player: 1 | 2, direction: number): void {
		if (player === 1) {
			this.state.paddle1.moving = direction;
		} else {
			this.state.paddle2.moving = direction;
		}
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

		// Update paddles
		paddle1.y = Math.max(
			0,
			Math.min(GAME_HEIGHT - PADDLE_HEIGHT, paddle1.y + paddle1.moving * PADDLE_SPEED)
		);
		paddle2.y = Math.max(
			0,
			Math.min(GAME_HEIGHT - PADDLE_HEIGHT, paddle2.y + paddle2.moving * PADDLE_SPEED)
		);

		// Update ball
		ball.x += ball.vx;
		ball.y += ball.vy;

		// Ball collision with top/bottom
		if (ball.y <= 0 || ball.y >= GAME_HEIGHT - BALL_SIZE) {
			ball.vy *= -1;
		}

		// Ball collision with paddles
		if (
			ball.x <= PADDLE_WIDTH &&
			ball.y >= paddle1.y &&
			ball.y <= paddle1.y + PADDLE_HEIGHT
		) {
			ball.vx = Math.abs(ball.vx);
			ball.vy += (Math.random() - 0.5) * 2;
		}

		if (
			ball.x >= GAME_WIDTH - PADDLE_WIDTH - BALL_SIZE &&
			ball.y >= paddle2.y &&
			ball.y <= paddle2.y + PADDLE_HEIGHT
		) {
			ball.vx = -Math.abs(ball.vx);
			ball.vy += (Math.random() - 0.5) * 2;
		}

		// Score
		if (ball.x < 0) {
			score.player2++;
			this.resetBall();
		} else if (ball.x > GAME_WIDTH) {
			score.player1++;
			this.resetBall();
		}
	}

	private resetBall(): void {
		this.state.ball = {
			x: GAME_WIDTH / 2,
			y: GAME_HEIGHT / 2,
			vx: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
			vy: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1)
		};
	}
}

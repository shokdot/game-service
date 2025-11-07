export interface Ball {
	x: number;
	y: number;
	vx: number;
	vy: number;
}

export interface Paddle {
	y: number;
	moving: number;
}

export interface Score {
	player1: number;
	player2: number;
}

export interface GameState {
	ball: Ball;
	paddle1: Paddle;
	paddle2: Paddle;
	score: Score;
}

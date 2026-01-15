import { z } from "zod";

const envSchema = z.object({
	PORT: z.coerce.number().int().min(1).max(65535).default(3003),
	HOST: z.string().default("0.0.0.0"),
	SERVICE_TOKEN: z.string().min(1, "SERVICE_TOKEN is required"),
	JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
	JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET is required"),
	JWT_TWO_FA: z.string().min(1, "JWT_TWO_FA is required"),
	ROOM_SERVICE_URL: z.url("ROOM_SERVICE_URL must be a valid URL"),
	USER_SERVICE_URL: z.url("USER_SERVICE_URL must be a valid URL")
});

const env = envSchema.parse(process.env);

export const PORT = env.PORT;
export const HOST = env.HOST;
export const SERVICE_TOKEN = env.SERVICE_TOKEN;
export const JWT_SECRET = env.JWT_SECRET;
export const JWT_REFRESH_SECRET = env.JWT_REFRESH_SECRET;
export const JWT_TWO_FA = env.JWT_TWO_FA;
export const ROOM_SERVICE_URL = env.ROOM_SERVICE_URL;
export const USER_SERVICE_URL = env.USER_SERVICE_URL;
export const SERVICE_NAME = 'GAME_SERVICE';

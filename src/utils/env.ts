import { z } from "zod";

const envSchema = z.object({
	PORT: z.coerce.number().default(3003),
	HOST: z.string().default("0.0.0.0"),
	SERVICE_TOKEN: z.string(),
	JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
	JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET is required"),
	JWT_TWO_FA: z.string().min(1, "JWT_TWO_FA is required"),
	ROOM_SERVICE_URL: z.string().min(1, "ROOM_SERVICE_URL is required")
});

const env = envSchema.parse(process.env);

export const PORT = env.PORT;
export const HOST = env.HOST;
export const SERVICE_TOKEN = env.SERVICE_TOKEN;
export const JWT_SECRET = env.JWT_SECRET;
export const JWT_REFRESH_SECRET = env.JWT_REFRESH_SECRET;
export const JWT_TWO_FA = env.JWT_TWO_FA;
export const ROOM_SERVICE_URL = env.ROOM_SERVICE_URL;
export const SERVICE_NAME = 'GAME_SERVICE';

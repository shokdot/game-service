import { z } from "zod";

const envSchema = z.object({
	PORT: z.coerce.number().default(3003),
	HOST: z.string().default("0.0.0.0"),
	SERVICE_TOKEN: z.string()
});

const env = envSchema.parse(process.env);

export const PORT = env.PORT;
export const HOST = env.HOST;
export const SERVICE_TOKEN = env.SERVICE_TOKEN;
export const SERVICE_NAME = 'GAME_SERVICE';

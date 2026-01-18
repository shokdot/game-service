import { RouteShorthandOptions } from "fastify";
import { errorResponseSchema } from '@core/schemas/error.schema.js'
import serviceAuth from "@core/middlewares/serviceAuth.middleware.js";

const getGameStateSchema: RouteShorthandOptions =
{
    preHandler: [serviceAuth],
    schema:
    {
        description: "Get game state",
        tags: ["Internal"],
        params: {
            type: 'object',
            required: ['roomId'],
            properties: {
                roomId: { type: 'string' }
            }
        },
        response: {
            200: {
                type: 'object',
                required: ['status', 'data', 'message'],
                additionalProperties: false,
                properties: {
                    status: { type: 'string', enum: ['success'] },
                    data: { type: 'object' },
                    message: { type: 'string' }
                },
            },

            401: errorResponseSchema,
            403: errorResponseSchema,
            404: errorResponseSchema,
            500: errorResponseSchema
        },
    },
};

export default getGameStateSchema;

import { RouteShorthandOptions } from "fastify";
import { errorResponseSchema } from '@core/schemas/error.schema.js'
import serviceAuth from "@core/middlewares/serviceAuth.middleware.js";

const forceEndGameSchema: RouteShorthandOptions =
{
    preHandler: [serviceAuth],
    schema:
    {
        description: "Force end a game",
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
                required: ['status', 'message'],
                additionalProperties: false,
                properties: {
                    status: { type: 'string', enum: ['success'] },
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

export default forceEndGameSchema;

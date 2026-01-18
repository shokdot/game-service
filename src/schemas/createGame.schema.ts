import { RouteShorthandOptions } from "fastify";
import { errorResponseSchema } from '@core/schemas/error.schema.js'
import serviceAuth from "@core/middlewares/serviceAuth.middleware.js";

const createGameSchema: RouteShorthandOptions =
{
    preHandler: [serviceAuth],
    schema:
    {
        description: "Create a new game",
        tags: ["Internal"],
        body: {
            type: 'object',
            required: ['roomId', 'userIds'],
            additionalProperties: true,
            properties: {
                roomId: { type: 'string' },
                userIds: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 2 },
                winScore: { type: 'number', minimum: 1, maximum: 100 }
            }
        },
        response: {
            200: {
                type: 'object',
                required: ['status', 'data', 'message'],
                additionalProperties: false,
                properties: {
                    status: { type: 'string', enum: ['success'] },
                    data: {
                        type: 'object',
                        required: ['roomId'],
                        additionalProperties: false,
                        properties: {
                            roomId: { type: 'string' }
                        }
                    },
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

export default createGameSchema;

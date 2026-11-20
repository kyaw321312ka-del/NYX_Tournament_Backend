const { z } = require('zod');

const categoryIdSchema = z.object({
    categoryId: z.coerce.number().int().positive(),
});

const drawIdSchema = z.object({
    drawId: z.coerce.number().int().positive(),
});

const matchIdSchema = z.object({
    drawId: z.coerce.number().int().positive(),
    matchId: z.coerce.number().int().positive(),
});

const categoryAndDrawIdSchema = z.object({
    categoryId: z.coerce.number().int().positive(),
    drawId: z.coerce.number().int().positive(),
});

const createDrawSchema = z.object({
    drawFormat: z.literal('SINGLE_ELIMINATION'),
    seedingMethod: z.literal('MANUAL'),
}).strict();

const assignmentSchema = z.object({
    registrationId: z.coerce.number().int().positive(),
    bracketPosition: z.coerce.number().int().positive(),
}).strict();

const assignPositionsSchema = z.object({
    assignments: z.array(assignmentSchema),
}).strict();

const recordMatchResultSchema = z.object({
    games: z.array(z.object({
        gameNumber: z.coerce.number().int().positive(),
        participant1Score: z.coerce.number().int().nonnegative(),
        participant2Score: z.coerce.number().int().nonnegative(),
    }).strict()).min(1).max(9),
}).strict();

module.exports = {
    categoryIdSchema,
    drawIdSchema,
    matchIdSchema,
    categoryAndDrawIdSchema,
    createDrawSchema,
    assignPositionsSchema,
    recordMatchResultSchema,
};

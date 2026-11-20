const { z } = require('zod');

const categoryIdSchema = z.object({
    categoryId: z.coerce.number().int().positive(),
});

const drawIdSchema = z.object({
    drawId: z.coerce.number().int().positive(),
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

module.exports = {
    categoryIdSchema,
    drawIdSchema,
    categoryAndDrawIdSchema,
    createDrawSchema,
    assignPositionsSchema,
};

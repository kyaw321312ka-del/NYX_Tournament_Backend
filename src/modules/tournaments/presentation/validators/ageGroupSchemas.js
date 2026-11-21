const { z } = require('zod');

const ageGroupName = z.string().trim().min(1).max(50);
const maximumAge = z.coerce.number().int().min(0).max(120);

const ageGroupIdSchema = z.object({
    id: z.coerce.number().int().positive(),
});

const createAgeGroupSchema = z.object({
    name: ageGroupName,
    age: maximumAge,
}).strict();

const updateAgeGroupSchema = z.object({
    name: ageGroupName.optional(),
    age: maximumAge.optional(),
}).strict().refine(
    (value) => Object.keys(value).length > 0,
    'At least one field must be provided.',
);

module.exports = {
    ageGroupIdSchema,
    createAgeGroupSchema,
    updateAgeGroupSchema,
};

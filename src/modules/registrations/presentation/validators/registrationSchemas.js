const { z } = require('zod');

const createRegistrationSchema = z.object({
    tournamentCategoryId: z.coerce.number().int().positive(),
    members: z.array(z.coerce.number().int().positive()).optional().default([]),
});

const createPartnerInvitationSchema = z.object({
    tournamentCategoryId: z.coerce.number().int().positive(),
    partnerEmail: z.string().trim().pipe(z.email().max(254)).transform((email) => email.toLowerCase()),
});

const listMyRegistrationsSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const invitationIdSchema = z.object({
    id: z.coerce.number().int().positive(),
});

module.exports = {
    createRegistrationSchema,
    createPartnerInvitationSchema,
    listMyRegistrationsSchema,
    invitationIdSchema,
};

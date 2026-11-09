const { z } = require('zod');

const paymentIdSchema = z.object({
    id: z.coerce.number().int().positive(),
});

const registrationIdSchema = z.object({
    registrationId: z.coerce.number().int().positive(),
});

const submitPaymentSchema = z.object({
    paymentMethodId: z.coerce.number().int().positive(),
    transactionReference: z.string().trim().max(150).optional()
        .transform((value) => value || null),
});

const listPaymentHistorySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const rejectPaymentSchema = z.object({
    rejectionReason: z.string().trim().min(1).max(10000),
});

module.exports = {
    paymentIdSchema,
    registrationIdSchema,
    submitPaymentSchema,
    listPaymentHistorySchema,
    rejectPaymentSchema,
};

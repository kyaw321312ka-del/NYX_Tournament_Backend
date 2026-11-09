const { z } = require('zod');

const paymentMethodName = z.string().trim().min(1).max(100);
const accountName = z.string().trim().min(1).max(150);
const accountNumber = z.string().trim().min(1).max(100);

const paymentMethodIdSchema = z.object({
    id: z.coerce.number().int().positive(),
});

const createPaymentMethodSchema = z.object({
    paymentMethodName,
    accountName,
    accountNumber,
});

const updatePaymentMethodSchema = z.object({
    paymentMethodName: paymentMethodName.optional(),
    accountName: accountName.optional(),
    accountNumber: accountNumber.optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.');

const setPaymentMethodStatusSchema = z.object({
    isActive: z.boolean(),
});

module.exports = {
    paymentMethodIdSchema,
    createPaymentMethodSchema,
    updatePaymentMethodSchema,
    setPaymentMethodStatusSchema,
};

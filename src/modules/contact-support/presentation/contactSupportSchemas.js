const { z } = require('zod');

const contactSupportSchema = z.object({
    phone: z.string().trim().min(1).max(50),
    website: z.string().trim().min(1).max(2048),
    email: z.string().trim().pipe(z.email().max(254)).transform((email) => email.toLowerCase()),
    address: z.string().trim().min(1).max(500),
}).strict();

module.exports = {
    contactSupportSchema,
};

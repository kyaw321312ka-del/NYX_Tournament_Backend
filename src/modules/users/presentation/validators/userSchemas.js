const { z } = require('zod');

const emailSchema = z.string()
    .trim()
    .pipe(z.email().max(254, 'Email must be no longer than 254 characters.'))
    .transform((email) => email.toLowerCase());
const passwordSchema = z.string()
    .min(8, 'Password must be at least 8 characters long.')
    .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, {
        message: 'Password must be no longer than 72 bytes.',
    });
const categoryIdsSchema = z.array(z.coerce.number().int().positive())
    .min(1, 'Choose at least one player category.')
    .max(5, 'Choose no more than 5 player categories.')
    .refine((ids) => new Set(ids).size === ids.length, 'Player categories must not be duplicated.');
const birthdaySchema = z.iso.date().refine(
    (birthday) => birthday <= new Date().toISOString().slice(0, 10),
    'Birthday cannot be in the future.',
);

const updateProfileSchema = z.object({
    name: z.string().trim().min(1).max(150).optional(),
    clubName: z.string().trim().max(150).nullable().optional()
        .transform((clubName) => (clubName === '' ? null : clubName)),
    gender: z.preprocess(
        (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
        z.enum(['male', 'female']),
    ).optional(),
    birthday: birthdaySchema.optional(),
    phno: z.string().trim().max(30).nullable().optional()
        .transform((phone) => (phone === '' ? null : phone)),
    email: emailSchema.optional(),
    categoryIds: categoryIdsSchema.optional(),
    currentPassword: z.string().min(1).refine(
        (password) => Buffer.byteLength(password, 'utf8') <= 72,
        'Current password must be no longer than 72 bytes.',
    ).optional(),
    password: passwordSchema.optional(),
}).strict()
    .refine(
        (profile) => Object.keys(profile).some((key) => key !== 'currentPassword'),
        'At least one profile field must be provided.',
    )
    .refine(
        (profile) => (!profile.email && !profile.password) || Boolean(profile.currentPassword),
        'Current password is required to change email or password.',
    );

const verifyEmailChangeSchema = z.object({
    otp: z.string().regex(/^\d{6}$/, 'Verification code must contain exactly 6 digits.'),
}).strict();

module.exports = { updateProfileSchema, verifyEmailChangeSchema };

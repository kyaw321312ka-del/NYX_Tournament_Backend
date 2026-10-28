const { z } = require('zod');

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long.')
  .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, {
    message: 'Password must be no longer than 72 bytes.',
  });

const emailSchema = z.string().trim().pipe(z.email().max(254, 'Email must be no longer than 254 characters.'))
  .transform((email) => email.trim().toLowerCase());

const register = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(150, 'Name must be no longer than 150 characters.'),
  phno: z.string().trim().max(30, 'Phone number must be no longer than 30 characters.')
    .optional()
    .transform((phone) => phone || null),
  email: emailSchema,
  password: passwordSchema,
});

const verifyEmail = z.object({
  email: emailSchema,
  otp: z.string().regex(/^\d{6}$/, 'Verification code must contain exactly 6 digits.'),
});

const login = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.').refine(
    (password) => Buffer.byteLength(password, 'utf8') <= 72,
    { message: 'Password must be no longer than 72 bytes.' },
  ),
});

module.exports = { register, verifyEmail, login };
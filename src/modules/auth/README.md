# Authentication API

Copy `.env.example` to `.env` and set the database connection, SMTP sender, and
independent, randomly generated `JWT_SECRET` and `OTP_SECRET` values (at least
32 bytes each). Generate a secret with
`node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
Never commit `.env`.

All routes are under `/api/auth`:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/categories` | List player categories available during registration |
| `POST` | `/register` | Create a pending registration and email a six-digit code |
| `POST` | `/verify-email` | Verify the code, create the account with the `user` role, and return a bearer token |
| `POST` | `/login` | Sign in with a verified account and return a bearer token |
| `GET` | `/me` | Return the current account; requires `Authorization: Bearer <token>` |

Registration uses `multipart/form-data` with text fields `name`, `email`,
`password`, `gender`, one or more `categoryIds`, and optional `phno`, plus required file fields `frontIdImg` and
`backIdImg`. An optional `profileImage` file may also be included. Identity
documents accept JPEG, PNG, or WebP up to 10 MB each; the profile image accepts
the same formats up to 5 MB. Files are stored while the account is pending
email verification, then their references are copied to the user account when
the OTP is verified. Identity documents remain private; the profile image is
publicly served.

The required `gender` field accepts `male` or `female` (case-insensitive).
Gender determines eligibility for gendered tournament categories.

Verification accepts `{ "email", "otp" }`. Login accepts `{ "email",
"password" }`. Passwords are bcrypt-hashed; verification codes are stored as
keyed hashes, expire after ten minutes, and allow at most five attempts.
Access tokens use HS256 and expire after one hour. Auth endpoints are
rate-limited per IP.

Fetch the available categories before registration with
`GET /api/auth/categories`. Seed the standard badminton event categories with
`npm run seed:player-categories`. During multipart registration, send one
`categoryIds` text field per selected category ID; selected categories are
attached to the account after email verification.

Run the auth unit tests with `npm test`.

Apply the Prisma migration before using the routes:

```sh
npx prisma migrate deploy
```

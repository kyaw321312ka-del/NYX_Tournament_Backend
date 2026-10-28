# Authentication API

Copy `.env.example` to `.env` and set the database connection, SMTP sender, and
independent, randomly generated `JWT_SECRET` and `OTP_SECRET` values (at least
32 bytes each). Generate a secret with
`node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
Never commit `.env`.

All routes are under `/api/auth`:

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/register` | Create a pending registration and email a six-digit code |
| `POST` | `/verify-email` | Verify the code, create the account with the `user` role, and return a bearer token |
| `POST` | `/login` | Sign in with a verified account and return a bearer token |
| `GET` | `/me` | Return the current account; requires `Authorization: Bearer <token>` |

Registration accepts `{ "name", "email", "password", "phno?" }`.
Verification accepts `{ "email", "otp" }`. Login accepts `{ "email",
"password" }`. Passwords are bcrypt-hashed; verification codes are stored as
keyed hashes, expire after ten minutes, and allow at most five attempts.
Access tokens use HS256 and expire after one hour. Auth endpoints are
rate-limited per IP.

Run the auth unit tests with `npm test`.

Apply the Prisma migration before using the routes:

```sh
npx prisma migrate deploy
```

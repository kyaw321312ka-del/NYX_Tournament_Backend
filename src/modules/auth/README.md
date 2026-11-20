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

`GET /api/auth/me` returns the authenticated account's contact and profile
fields, selected player categories, and identity-document upload/verification
status. It does not expose private document filenames or password hashes.

Update the current player's profile with `PATCH /api/users/me`, for example
with JSON body `{"clubName":"Yangon Badminton Club","address":"Yangon"}`.
Use `null` to clear either field. The profile response includes `clubName` and
`address`.

An administrator can review uploaded identity documents with
`PATCH /api/users/:userId/identity-documents/status`, using an admin bearer
token and a JSON body such as `{"verificationStatus":"approved"}` or
`{"verificationStatus":"rejected"}`. Approval requires both document images.
Uploading or replacing identity documents resets their status to `pending`.

List players for the admin table with `GET /api/admin/users?page=1&pageSize=20`.
Each row includes `playerId` (`#NYX-` plus the user ID), `athleteName`,
`teamClub`, `contactEmail`, `phoneNumber`, and cumulative ranking `points`.
`status` is `Active` for identity-approved players, `Rejected` for rejected
documents, and `Pending` otherwise. The “View Details” action is a frontend
control; it can load a player's details with
`GET /api/admin/users/:userId`, using the row's numeric `id`. The detail
response includes profile and category data, identity-document upload and
review status (not private document filenames), total points, and award history.

Registration uses `multipart/form-data` with text fields `name`, `email`,
`password`, `gender`, `birthday`, one or more `categoryIds`, and optional
`phno`, `address`, and `clubName`, plus required file fields `frontIdImg` and
`backIdImg`. An optional `profileImage` file may also be included. Identity
documents accept JPEG, PNG, or WebP up to 10 MB each; the profile image accepts
the same formats up to 5 MB. Files are stored while the account is pending
email verification, then their references are copied to the user account when
the OTP is verified. Identity documents remain private; the profile image is
publicly served.

The required `gender` field accepts `male` or `female` (case-insensitive);
`birthday` is a required date in `YYYY-MM-DD` format. `address` is limited to
500 characters and `clubName` to 150 characters. Both are saved to the player
profile after email verification. Gender determines eligibility for gendered
tournament categories.

Verification accepts `{ "email", "otp" }`. Login accepts `{ "email",
"password" }`. Passwords are bcrypt-hashed; verification codes are stored as
keyed hashes, expire after ten minutes, and allow at most five attempts.
Access tokens use HS256 and expire after one hour. Auth endpoints are
rate-limited per IP.

Fetch the available categories before registration with
`GET /api/auth/categories`; each item includes `id`, `categoryCode`, `name`, and
`pairingType`.
These records are also the master catalog used by tournament categories. Seed
the standard badminton event categories with
`npm run seed:player-categories`. During multipart registration, send one
`categoryIds` text field per selected category ID; selected categories are
attached to the account after email verification.

Run the auth unit tests with `npm test`.

Player details are stored in `user_profiles`, while identity-document references
and verification status are stored in `user_identity_documents`. The migration
copies existing values from `users` before removing the old columns. Deploy it
before restarting the application:

```sh
npx prisma migrate deploy
```

`npx prisma generate` only regenerates the Prisma Client; it does not change the
database schema.

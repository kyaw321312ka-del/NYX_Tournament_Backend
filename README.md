# NYX Tournament Backend

## GitHub Actions deployment

The workflow in `.github/workflows/ci-cd.yml` runs `npm ci`, generates the
Prisma Client, and runs the test suite for pull requests and pushes to `main`.
After CI succeeds on a push to `main`, it deploys over SSH to the cPanel
application at `/home/magwkdjx/repositories/NYX_Tournament_Backend`. A manual
workflow run deploys only when run against `main`.

The deployment reuses these repository Actions secrets:

- `NAMECHEAP_HOST`
- `NAMECHEAP_USER`
- `NAMECHEAP_PORT`
- `NAMECHEAP_SSH_KEY`
- `NAMECHEAP_KNOWN_HOSTS`

`NAMECHEAP_KNOWN_HOSTS` must contain the verified ED25519 SSH host key in
`known_hosts` format for the exact host and port. For a non-default port, the
host field must be `[host]:port`. Verify the key fingerprint with Namecheap
before saving it as a secret; do not disable strict host-key checking.

The host must have the application repository checked out with an `origin`
remote that can fetch `main`. Its production `.env` must already be configured
in the application root, including `DATABASE_URL`; deployment loads the value
from that file for its preflight check without printing it. Configure the cPanel
application to use Node.js 24; deployment activates
`/home/magwkdjx/nodevenv/repositories/NYX_Tournament_Backend/24/bin/activate`.
The workflow runs `npm install --include=dev --no-audit --no-fund`, verifies
the cPanel `node_modules` symlink remains intact, then runs `prisma generate`
and `prisma migrate deploy` before restarting Passenger via `tmp/restart.txt`.
Production migrations must be committed to the repository;
`prisma migrate dev` is never run by CI/CD.

## Full tournament test data

For local development only, first apply the committed migrations with
`npx prisma migrate deploy`, then run `npm run seed:full-tournament`. This
creates 35 synthetic player accounts (`nyx.seed.player.NN@example.test`), a
published Men's Singles tournament, paid and confirmed registrations, test
payment proof, and a published 64-position single-elimination draw. The draw
has 29 first-round byes; match results are left unplayed. The seed can be rerun
without creating duplicate players, registrations, payments, or draws.

Set these values in a local, untracked `.env` before running the seeder:

```env
NODE_ENV=development
SEED_TEST_DATA=true
ADMIN_EMAIL=existing-admin@example.com
TEST_USERS_PASSWORD=a-local-test-password-at-least-12-characters
```

The seeder refuses to run when `NODE_ENV=production` and requires the explicit
`SEED_TEST_DATA=true` opt-in. Keep this pointed at a development database, and
never commit the test password or seed these accounts on a public production
server. All generated players share `TEST_USERS_PASSWORD`.

## Frontend CORS

The API allows frontend requests from `http://localhost:5173`,
`http://127.0.0.1:5173`, `https://nyxtournament.com`, and
`https://www.nyxtournament.com` by default. Add any additional frontend origins
with `CORS_ORIGINS` in `.env` as a comma-separated list; configured values are
added to the built-in origins:

```env
CORS_ORIGINS=https://frontend.example.com
```

Include only trusted frontend origins. Requests without an `Origin` header,
such as Bruno or server-to-server requests, are also accepted. Cookie
credentials are not enabled; bearer-token authorization is supported.

Authentication routes are available under both `/api/auth` and `/auth` for
compatibility with existing frontend clients. Other API modules remain under
`/api`.

## Account updates and logout

New registrations must include `birthday` as a date-only `YYYY-MM-DD` value.
The date cannot be in the future. Existing accounts without a birthday can
continue using the API and add it through the profile update endpoint.

Authenticated users can update their profile with `PATCH /api/users/me`.
Supported fields are `name`, `gender`, `birthday`, `phno`, `categoryIds`, `email`,
`password`, `profileImage`, `frontIdImg`, and `backIdImg`. Send JSON for
text-only changes; use `multipart/form-data` when uploading images. In Bruno,
set `categoryIds` to the JSON text `[1,2]` and provide image fields as files.
Do not manually set the multipart `Content-Type` header. The profile image is
limited to 5 MB; each identity document is limited to 10 MB.

Example JSON update:

```http
PATCH /api/users/me
Authorization: Bearer <access-token>
Content-Type: application/json
```

```json
{
  "name": "New Name",
  "gender": "female",
  "birthday": "1995-08-12",
  "phno": "+959123456789"
}
```

To upload all profile fields together in Bruno, choose **Body → Multipart
Form**, add the text fields `name`, `gender`, `phno`, `password`,
`currentPassword`, and `categoryIds` as needed, then attach files using
`profileImage`, `frontIdImg`, and `backIdImg`. Get category IDs from
`GET /api/auth/categories`. Changing a password or requesting an email change
requires `currentPassword`.

Email changes take effect only after the new address is verified:

```json
{
  "email": "new-address@example.com",
  "currentPassword": "current-password"
}
```

After the API sends a code to the new address, submit it to
`POST /api/users/me/email/verify` as `{"otp":"123456"}`.
The code expires after 10 minutes and allows up to five attempts.

Logout with `POST /api/auth/logout` and the current bearer token. The API
revokes that access token immediately; the client should also remove its
stored bearer token.

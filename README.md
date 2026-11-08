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
in the application root, including `DATABASE_URL`. Configure the cPanel
application to use Node.js 24; deployment activates
`/home/magwkdjx/nodevenv/repositories/NYX_Tournament_Backend/24/bin/activate`.
The workflow runs `npm install --include=dev --no-audit --no-fund`, verifies
the cPanel `node_modules` symlink remains intact, then runs `prisma generate`
and `prisma migrate deploy` before restarting Passenger via `tmp/restart.txt`.
Production migrations must be committed to the repository;
`prisma migrate dev` is never run by CI/CD.

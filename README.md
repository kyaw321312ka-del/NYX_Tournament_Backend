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

The host must have the application repository checked out with an `origin`
remote that can fetch `main`. Its production `.env` must already be configured
in the application root, including `DATABASE_URL`. Configure the cPanel
application to use Node.js 22 or newer; deployment activates the standard
`nodevenv/<app-root>/22` environment when present. The workflow runs
`npm ci --include=dev`, `prisma generate`, and `prisma migrate deploy`, prunes
development dependencies, then restarts the cPanel Passenger application via
`tmp/restart.txt`. Production migrations must be committed to the repository;
`prisma migrate dev` is never run by CI/CD.

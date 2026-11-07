# Sample Shop: LaunchComply live launch test app

A deliberately small app for testing LaunchComply's guided launch end to end:

- `web/`: Vite + React website (goes to Vercel). Reads `VITE_API_URL`.
- `api/`: FastAPI backend (goes to Render). Reads `DATABASE_URL`, exposes
  `/health` and `POST /api/visits`.
- The visit counter is stored in Postgres (goes to Neon).

There are no secrets in this repository. LaunchComply sets `DATABASE_URL` on
Render and `VITE_API_URL` on Vercel during "Connect & go live".

Copy this folder into its own new GitHub repository (the repository root must
contain `web/` and `api/`). Then follow
`docs/implementation/2026-11-07-first-live-launch-runbook.md` in the
LaunchComply repository.

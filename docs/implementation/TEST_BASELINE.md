# Reproducible architecture baseline

14 October 2026. Test-only constraints preserve the tested Python 3.11 dependency
closure; production requirements remain unchanged. Node dependencies use the
existing `apps/web/package-lock.json` (`npm ci`).

## API (offline providers, disposable SQLite)

From `apps/api`, create a Python 3.11 `.venv`, then run:

```text
python -m pip install -r requirements.txt -c constraints-test.txt
python -m pytest tests -q -ra
```

Use the virtual environment's Python. `tests/conftest.py` overrides the database
with a unique `.test_tmp/pytest-*.db` before importing the application. It creates,
seeds and drops only that isolated database. Default pytest discovery is `tests`.
Four `live` health checks skip unless explicitly given `LIVE_API_URL`; these are
read-only checks, not deployment acceptance.

`fixtures/architecture/saas-v1.json` is synthetic. It covers four frontends, an API,
unresolved browser traffic, seven configured AWS resources, disconnected logs,
empty graphs, monorepo-root metadata and invalid cross-VPC references. The baseline
tests verify configuration persistence through save, history and restore. They do
not prove the source-refresh preservation work planned in A02.

## Browser (isolated API, actual saved designs)

From `apps/web`:

```text
npm ci
npm run typecheck
npm run lint
npm run test:config
```

Build with `BACKEND_URL=http://127.0.0.1:8000` and
`NEXT_PUBLIC_API_URL=/api/backend`, then `npm run build`. These are process
environment variables; do not change hosted environment files for this test.
Run `npx playwright test tests/e2e/architecture-map.spec.ts --workers=1`.
Local tests use installed Chrome; CI installs Playwright Chromium. The config
starts its own API and frontend, disallows server reuse and remote base URLs, and
checks the built API rewrite destination. Do not reuse a build compiled with a
hosted `NEXT_PUBLIC_API_URL`. Custom web commands must also use a local API.

The map journeys register synthetic businesses, create real assets/designs,
save India region settings, inspect markers/connections and open the editor.
They do not call GitHub, AI providers or AWS. Browser artifacts and fixture auth
state stay in ignored `test-results/`.

## PostgreSQL (separate suite, migrations, real locks)

Start a disposable PostgreSQL 16 service bound to loopback with database
`postgres` and administrator role `lc_test_admin`. Set `LC_TEST_PG_ADMIN_URL` to
its connection URL and run from `apps/api`:

```text
python -m scripts.run_postgres_tests
```

The runner does not use application `DATABASE_URL` or read an environment file.
It rejects remote hosts, other database/administrator names and URL options. It
creates a random database and non-superuser role, migrates a populated historical
schema to head, checks migration drift, tests API tenancy/history and a real row
lock, then removes only the generated database and role. Never point this at a
production PostgreSQL service. The database owner is not an RLS isolation proof.

`.github/workflows/architecture.yml` provides separate API, PostgreSQL and browser
jobs. PostgreSQL/hosted CI acceptance remains pending until actual run evidence is
recorded; merely committing the workflow does not pass that gate.

# Git Flow (GitHub + Railway)

## Branch strategy

- `dev`: integration branch for day-to-day changes.
- `main`: production branch. Railway should deploy from `main`.

## Daily workflow

1. Create/update changes on `dev`.
2. Push `dev`.
3. Open Pull Request: `dev` -> `main`.
4. Wait for CI (`.github/workflows/ci.yml`) to pass.
5. Merge PR to `main`.
6. Railway auto-deploys from `main`.

## Suggested repository settings (GitHub)

1. Protect `main`.
2. Require PR before merge.
3. Require status check `CI / build`.
4. Disable direct pushes to `main`.

## Railway settings

1. Connect this GitHub repository to Railway.
2. Set **Production Branch** to `main`.
3. Keep autodeploy enabled.
4. Configure all environment variables from `.env.example`.

## Resilience controls

1. Use PR checklist in `.github/PULL_REQUEST_TEMPLATE.md`.
2. Follow `docs/CHECKLIST_CAMBIOS_SEGUROS.md` before merge/deploy.
3. For incidents, execute `docs/RUNBOOK_INCIDENTES.md`.
4. Keep `docs/RESILIENCIA_METODOLOGIA.md` as operational baseline.

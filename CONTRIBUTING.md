# Contributing Guide

## Branching

1. Work in `dev`.
2. Open PR from `dev` to `main`.
3. Never push directly to `main`.

## Minimum quality checks

1. `npm run build`
2. Basic local functional validation of changed screens/endpoints.
3. Complete PR template checklist.

## Resilience requirements

1. Follow `docs/CHECKLIST_CAMBIOS_SEGUROS.md`.
2. For incidents, follow `docs/RUNBOOK_INCIDENTES.md`.
3. Do not run destructive operations in production.
4. Keep rollback steps in the PR description.

## Security

1. Never commit secrets (`.env`, keys, tokens, passwords).
2. Use environment variables and secret managers.
3. Report vulnerabilities privately (see `SECURITY.md`).

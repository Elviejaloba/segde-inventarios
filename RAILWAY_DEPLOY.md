# TaskTrackerPro - Local + Railway Deployment

## 1) Prepare local project

```bash
npm install
cp .env.example .env
```

Set at least:
- `DATABASE_URL`
- `BRIDGE_API_KEY`
- Dropbox vars (`DROPBOX_REFRESH_TOKEN` + `DROPBOX_APP_KEY` + `DROPBOX_APP_SECRET`, or `DROPBOX_ACCESS_TOKEN`)

Run locally:

```bash
npm run dev
```

Health check:

```bash
curl http://localhost:5000/api/health
```

## 2) Build + production test locally

```bash
npm run build
npm start
```

## 3) Bridge local service (Windows)

`bridge_ajustes_costos.py` now reads env vars. Example:

```powershell
$env:TARGET_BASE_URL="http://localhost:5000"
$env:BRIDGE_API_KEY="same_key_as_server"
$env:TANGO_SERVER="tangoserver"
$env:TANGO_DATABASE="crisa_real1"
$env:TANGO_USER="Axoft"
$env:TANGO_PASSWORD="Axoft"
python .\bridge_ajustes_costos.py
```

For Railway target:

```powershell
$env:TARGET_BASE_URL="https://<your-railway-domain>"
python .\bridge_ajustes_costos.py
```

## 4) Deploy to Railway

1. Push this project to GitHub (without secrets).
2. In Railway: **New Project -> Deploy from GitHub Repo**.
3. Railway will detect `railway.toml`.
4. Configure variables from `.env.example` in Railway.
5. Add PostgreSQL in Railway and set `DATABASE_URL`.
6. Deploy and verify:
   - `GET /api/health`
   - Bridge sync endpoint with `X-Bridge-Api-Key`

## 5) Important security cleanup before publish

- Rotate any leaked credentials (API keys, SMTP password, SQL credentials, Dropbox token).
- Do not commit `.env`, `.replit`, service logs, or `attached_assets/`.

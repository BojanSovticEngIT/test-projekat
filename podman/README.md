# Podman setup for Skill Matrix MVP

This folder contains a minimal Podman setup for local testing of the Skill Matrix MVP (Module 01 + Module 02):

- `db` — PostgreSQL 17
- `backend` — Spring Boot backend on port `8080`
- `frontend` — React/Vite production build served by Nginx on port `5173`

## Prerequisites

- Podman installed
- `podman compose` available
- On Windows, a running Podman machine

## Files

- `podman-compose.yml` — full multi-container stack
- `.env` — local default configuration

## Start the stack

```bash
cd podman
podman compose --env-file .env -f podman-compose.yml up --build
```

### Windows PowerShell

```powershell
cd podman
podman machine init   # once per machine
podman machine start
podman compose --env-file .env -f podman-compose.yml up --build
```

## Stop the stack

```bash
cd podman
podman compose -f podman-compose.yml down
```

## Stop and remove volumes

```bash
cd podman
podman compose -f podman-compose.yml down -v
```

## Application URLs

- Frontend: `http://localhost:5173`
- Backend API base: `http://localhost:8080/wms/skillmatrix`
- Swagger UI: `http://localhost:8080/wms/skillmatrix/swagger-ui.html`

## Demo users

Seed users are loaded by Liquibase during backend startup. All passwords: `password`

| Username | Role |
|----------|------|
| `admin` | `ADMIN` |
| `employee` | `EMPLOYEE` |
| `manager` | `LINE_MANAGER` |
| `hr` | `HR` |
| `pmo.user` | `PMO` |
| `hrbp.user` | `HR_BUSINESS_PARTNER` |

See [demo-script.md](../docs/tasks/module-02/demo-script.md) for the full Module 02 walkthrough.

## Environment variables

### Database & auth (required)

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_DB` | `skillmatrix` | PostgreSQL database name |
| `POSTGRES_USER` | `skillmatrix` | PostgreSQL user |
| `POSTGRES_PASSWORD` | `password` | PostgreSQL password |
| `APP_JWT_SECRET` | — | JWT signing secret (change in production) |
| `APP_JWT_EXPIRATION` | `86400000` | JWT lifetime in milliseconds |

### Email (optional)

When `SMTP_HOST` is empty, notifications are stored in-app and email content is logged.

| Variable | Default | Description |
|----------|---------|-------------|
| `SMTP_HOST` | — | SMTP server hostname |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | — | SMTP username |
| `SMTP_PASSWORD` | — | SMTP password |
| `SMTP_FROM` | `noreply@eng.it` | Sender address |

### Azure OpenAI (optional)

Reserved for future AI-assisted Excel column mapping in workforce import.

| Variable | Default | Description |
|----------|---------|-------------|
| `AZURE_OPENAI_ENDPOINT` | — | Azure OpenAI endpoint URL |
| `AZURE_OPENAI_KEY` | — | API key |

### Workday sync (optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `WORKDAY_SYNC_ENABLED` | `false` | Enable scheduled Workday sync (dev uses CSV adapter) |
| `WORKDAY_CSV_PATH` | `classpath:workday-sample.csv` | CSV file path or classpath resource |

## Notes

- The frontend is published on host port `5173` so it matches the backend CORS configuration.
- PostgreSQL data is stored in the named volume `skill-matrix-db-data`.
- The backend runs Liquibase automatically on startup.
- The frontend build uses `VITE_API_BASE_URL=http://localhost:8080/wms/skillmatrix`.

## Rebuild after code changes

```bash
cd podman
podman compose --env-file .env -f podman-compose.yml up --build
```

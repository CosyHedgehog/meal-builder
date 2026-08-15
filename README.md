# Meal Builder

A lightweight calorie tracking app with a Vue 3 frontend and Python SQLite backend.

## Project Structure

- `frontend/` - Vue 3 and Vite application
- `server.py` - Python API and production static-file server
- `scripts/` - Deployment and webhook scripts
- `meal_builder.sqlite3` - SQLite database

## Local Development

Install frontend dependencies:

```bash
cd frontend
npm install
```

Start the backend:

```bash
python server.py
```

In another terminal, start the Vite frontend:

```bash
cd frontend
npm run dev
```

The Vite development server proxies `/api` requests to the Python backend on port `5500`.

## Production Build

Build the frontend into `frontend/dist`:

```bash
cd frontend
npm run build
```

The Python server serves the built application from `frontend/dist`:

```bash
python server.py
```

## Deployment

Deployments are triggered by the GitHub webhook and run:

1. Fetch and fast-forward the configured branch.
2. Install frontend dependencies with `npm ci` when frontend files change.
3. Build the Vue frontend.
4. Restart the configured systemd service.

The deployment script is `scripts/deploy.sh`.

## SQLite Backups

Create rolling database backups on the VPS with:

```bash
chmod +x scripts/backup_database.sh
scripts/backup_database.sh
```

The script uses SQLite's online backup command, verifies the backup, and keeps the newest 14 backups by default in `backups/database/`. Override the location or retention count when needed:

```bash
BACKUP_DIR=/var/backups/meal-builder RETENTION_COUNT=30 scripts/backup_database.sh
```

For a daily cron job at 02:15, edit the crontab for the account that owns the application:

```cron
15 2 * * * /path/to/meal-builder/scripts/backup_database.sh >> /var/log/meal-builder-backup.log 2>&1
```

Keep the backup directory outside the public web root and consider copying it to separate storage for protection against VPS or disk failure.

## Requirements

- Python 3
- Node.js and npm
- A configured SQLite database
- For production: a systemd service and GitHub webhook

# Meal Builder

A simple Python + Nginx app deployed on a Hetzner VPS.

## Overview

- Frontend: `index.html`
- Backend: `server.py`
- Database: SQLite (`meal_builder.sqlite3`)
- Production path: `/home/dev/meal-builder`
- Production branch: `main`
- Git remote: `git@github.com-meal-builder:CosyHedgehog/meal-builder.git`
- API proxy: Nginx → `127.0.0.1:8000`

## Deployment philosophy

The repo should keep deployment helpers in place, but only one canonical README.
`scripts/deploy.sh` and `scripts/webhook.py` are deployment helpers, not permanent infrastructure complexity.
They make deployment safer and easier to manage without Docker or cron polling.

## Production deployment

### Required services

- `meal-builder.service`: runs the Python API app
- `meal-builder-webhook.service`: runs the GitHub webhook listener

### Nginx configuration

Nginx serves the frontend from `/home/dev/meal-builder` and proxies API requests to the local Python app.
Use a server block like this:

```nginx
server {
    listen 80;
    server_name your-domain.example;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        root /home/dev/meal-builder;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

Reload Nginx after changes:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Safe manual deployment

Use the helper script from the repo root on the VPS:

```bash
cd /home/dev/meal-builder
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

`scripts/deploy.sh` does the following:

- verifies the working tree is clean
- verifies the current branch is `main`
- fetches and fast-forwards from `origin/main`
- installs `requirements.txt` changes in `./venv`
- restarts `meal-builder.service` only when backend or dependency files changed
- logs output to `deploy.log`

This manual step should be tested before enabling webhook automation.

## GitHub webhook automation

The webhook listener is `scripts/webhook.py`.
It accepts GitHub push events, verifies the signature, and only deploys pushes to `main`.

Example `systemd` unit for the webhook listener:

```ini
[Unit]
Description=Meal Builder GitHub webhook listener
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/dev/meal-builder
ExecStart=/home/dev/meal-builder/venv/bin/python /home/dev/meal-builder/scripts/webhook.py
Restart=always
RestartSec=5
User=jason
Group=jason
Environment=GITHUB_WEBHOOK_SECRET=your_secret_here
Environment=WEBHOOK_PORT=9000
Environment=WEBHOOK_BRANCH=main

[Install]
WantedBy=multi-user.target
```

Use a GitHub webhook target like:

```text
http://your-vps-ip:9000/
```

In GitHub:

- Payload URL: webhook URL
- Content type: `application/json`
- Secret: same value as `GITHUB_WEBHOOK_SECRET`
- Events: `push`
- Only deploy `main`

## Persistent production data

Do not overwrite or delete these during deployment:

- `meal_builder.sqlite3`
- `venv/`
- `deploy.log`
- `webhook.log`
- `.env` or other secret files

## Local development

If you want to run the app locally instead of on VPS production:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python server.py
```

Then open:

```text
http://127.0.0.1:8000
```


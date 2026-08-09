MEAL BUILDER - SIMPLE SQLITE VERSION

Files:
  server.py            Python server + SQLite database/auth API
  index_sqlite.html    Meal Builder frontend
  meal_builder.sqlite3 Created automatically on first run

Requirements:
  Python 3.9+ (uses only Python standard library; no pip packages required)

Run:
  python server.py

Then open:
  http://127.0.0.1:8000

The app now:
  - requires a username and password
  - stores users in SQLite
  - hashes passwords with PBKDF2-SHA256
  - stores each user's Meal Builder data in SQLite
  - does not use localStorage
  - keeps the existing JSON export/import backup

Important:
SQLite is a server-side database, so the HTML must be opened through server.py rather than by double-clicking the HTML file.

For a public internet deployment, put the server behind HTTPS and use a production web server/reverse proxy. The included server is intentionally simple for local/private use.

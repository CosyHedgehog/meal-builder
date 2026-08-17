#!/usr/bin/env python3
import json, os, secrets, hashlib, hmac, sqlite3
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from http import cookies

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'meal_builder.sqlite3')
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend', 'dist')
HTML_PATH = os.path.join(FRONTEND_DIR, 'index.html')
HOST = '127.0.0.1'
PORT = 5500
SESSIONS = {}
SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 * 3  # 90 days

STATIC_CONTENT_TYPES = {
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
}

DEFAULT_DATA = {
    'ingredients': [],
    'foods': [],
    'groups': [
        {'id': 'group-breakfast', 'name': 'Breakfast'},
        {'id': 'group-lunch', 'name': 'Lunch'},
        {'id': 'group-dinner', 'name': 'Dinner'},
        {'id': 'group-snacks', 'name': 'Snacks'}
    ],
    'logs': {},
    'maintenanceCal': 2200,
    'showKcal': True,
    'allowPreviousDayLocking': False
}

def db():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    return conn

def init_db():
    conn = db()
    conn.executescript('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS user_data (
        user_id INTEGER PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS follows (
        follower_id INTEGER NOT NULL,
        following_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(follower_id, following_id),
        FOREIGN KEY(follower_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(following_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS daily_activity (
        user_id INTEGER NOT NULL,
        log_date TEXT NOT NULL,
        calories INTEGER NOT NULL,
        maintenance_calories INTEGER NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(user_id, log_date),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    ''')
    rows = conn.execute('SELECT user_id, data FROM user_data').fetchall()
    for row in rows:
        try:
            sharing_enabled = json.loads(row['data']).get('shareActivity', False) is True
        except (TypeError, ValueError):
            sharing_enabled = False
        if not sharing_enabled:
            conn.execute('DELETE FROM daily_activity WHERE user_id=?', (row['user_id'],))
    conn.commit(); conn.close()

def load_sessions():
    """Repopulate the in-memory session cache from disk on startup, so a
    server restart (e.g. from a deploy) doesn't log everyone out. Expired
    sessions are dropped."""
    conn = db()
    conn.execute("DELETE FROM sessions WHERE expires_at <= datetime('now')")
    conn.commit()
    rows = conn.execute('SELECT token,user_id,username FROM sessions').fetchall()
    conn.close()
    for row in rows:
        SESSIONS[row['token']] = {'user_id': row['user_id'], 'username': row['username']}

def hash_password(password, salt=None):
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 200_000)
    return salt.hex(), digest.hex()

def verify_password(password, salt_hex, expected_hex):
    _, digest = hash_password(password, bytes.fromhex(salt_hex))
    return hmac.compare_digest(digest, expected_hex)

def clean_username(username):
    return str(username or '').strip()

def valid_credentials(username, password):
    return 3 <= len(username) <= 40 and 6 <= len(password) <= 200 and all(c.isalnum() or c in '._-' for c in username)

def create_session(user_id, username):
    token = secrets.token_urlsafe(32)
    SESSIONS[token] = {'user_id': user_id, 'username': username}
    conn = db()
    conn.execute(
        "INSERT INTO sessions(token,user_id,username,expires_at) VALUES(?,?,?,datetime('now',?))",
        (token, user_id, username, f'+{SESSION_MAX_AGE_SECONDS} seconds')
    )
    conn.commit(); conn.close()
    return token

def destroy_session(token):
    SESSIONS.pop(token, None)
    conn = db(); conn.execute('DELETE FROM sessions WHERE token=?', (token,)); conn.commit(); conn.close()

def current_session(handler):
    raw = handler.headers.get('Cookie', '')
    jar = cookies.SimpleCookie(); jar.load(raw)
    token = jar.get('session')
    if not token: return None
    session = SESSIONS.get(token.value)
    if session: return session
    # Not in memory (e.g. server just restarted) — fall back to disk once
    # and warm the cache so we don't hit the DB on every request.
    conn = db()
    row = conn.execute(
        "SELECT user_id,username FROM sessions WHERE token=? AND expires_at > datetime('now')",
        (token.value,)
    ).fetchone()
    conn.close()
    if not row: return None
    session = {'user_id': row['user_id'], 'username': row['username']}
    SESSIONS[token.value] = session
    return session

def json_response(handler, status, payload, extra_headers=None):
    body = json.dumps(payload).encode('utf-8')
    handler.send_response(status)
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.send_header('Content-Length', str(len(body)))
    handler.send_header('Cache-Control', 'no-store')
    if extra_headers:
        for k,v in extra_headers.items(): handler.send_header(k,v)
    handler.end_headers(); handler.wfile.write(body)

def read_json(handler):
    length = int(handler.headers.get('Content-Length', '0'))
    if length > 5_000_000: raise ValueError('Request too large')
    raw = handler.rfile.read(length)
    return json.loads(raw.decode('utf-8') or '{}')

def resolve_static_path(url_path):
    """Resolve /assets/* requests inside the Vite dist directory."""
    parts = [p for p in url_path.split('/') if p not in ('', '.')]
    if len(parts) < 2 or parts[0] != 'assets': return None
    if any(p == '..' for p in parts): return None
    ext = os.path.splitext(parts[-1])[1].lower()
    if ext not in STATIC_CONTENT_TYPES: return None
    full_path = os.path.normpath(os.path.join(FRONTEND_DIR, *parts))
    if not full_path.startswith(FRONTEND_DIR + os.sep): return None
    if not os.path.isfile(full_path): return None
    return full_path, STATIC_CONTENT_TYPES[ext]

def serve_static_file(handler, full_path, content_type):
    with open(full_path, 'rb') as f: body = f.read()
    handler.send_response(200)
    handler.send_header('Content-Type', content_type)
    handler.send_header('Content-Length', str(len(body)))
    # Dev server: never let the browser cache these, so edits to css/js
    # show up on the next reload instead of being served from cache.
    handler.send_header('Cache-Control', 'no-store')
    handler.end_headers()
    handler.wfile.write(body)

def daily_calories(data):
    ingredients = {item.get('id'): item for item in data.get('ingredients', []) if isinstance(item, dict)}
    foods = {item.get('id'): item for item in data.get('foods', []) if isinstance(item, dict)}

    def food_kcal(food):
        if not food: return 0
        if food.get('mode') == 'simple' or not food.get('items'):
            return round(float(food.get('kcal') or 0))
        total = 0
        for item in food.get('items', []):
            ingredient = ingredients.get(item.get('ingredientId'))
            if not ingredient: continue
            amount = float(item.get('amount') or 0)
            value = float(ingredient.get('kcal') or 0)
            total += amount / 100 * value if ingredient.get('unit') == 'g' else amount * value
        return round(total)

    summaries = []
    for log_date, log in (data.get('logs') or {}).items():
        if not isinstance(log, dict): continue
        calories = 0
        for entry in log.get('entries', []):
            if not isinstance(entry, dict): continue
            qty = float(entry.get('qty') or 1)
            calories += round(food_kcal(foods.get(entry['foodId'])) * qty) if entry.get('foodId') else round(float(entry.get('kcal') or 0) * qty)
        if log.get('entries'):
            summaries.append((str(log_date), calories))
    return summaries

def update_activity(conn, user_id, data):
    conn.execute('DELETE FROM daily_activity WHERE user_id=?', (user_id,))
    conn.executemany(
        'INSERT INTO daily_activity(user_id,log_date,calories,maintenance_calories) VALUES(?,?,?,?)',
        [(user_id, date, calories, round(float(data.get('maintenanceCal') or 2200))) for date, calories in daily_calories(data)]
    )

class Handler(BaseHTTPRequestHandler):
    server_version = 'MealBuilderSQLite/1.0'

    def log_message(self, fmt, *args):
        print('%s - %s' % (self.address_string(), fmt % args))

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        if path == '/':
            try:
                with open(HTML_PATH, 'rb') as f: body = f.read()
            except FileNotFoundError:
                return json_response(self, 500, {'error':'Frontend build not found. Run npm run build in frontend/.'})
            self.send_response(200); self.send_header('Content-Type','text/html; charset=utf-8'); self.send_header('Content-Length',str(len(body))); self.end_headers(); self.wfile.write(body); return
        static = resolve_static_path(path)
        if static:
            return serve_static_file(self, *static)
        if path == '/api/me':
            s=current_session(self)
            return json_response(self,200,{'user': {'username':s['username']} if s else None})
        if path == '/api/data':
            s=current_session(self)
            if not s: return json_response(self,401,{'error':'Not logged in'})
            conn=db(); row=conn.execute('SELECT data FROM user_data WHERE user_id=?',(s['user_id'],)).fetchone(); conn.close()
            data=json.loads(row['data']) if row else DEFAULT_DATA
            return json_response(self,200,{'data':data})
        if path == '/api/users':
            s=current_session(self)
            if not s: return json_response(self,401,{'error':'Not logged in'})
            query=parse_qs(parsed.query).get('q',[''])[0].strip()
            pattern = f'%{query}%'
            conn=db(); rows=conn.execute("SELECT id,username FROM users WHERE id != ? AND username LIKE ? COLLATE NOCASE ORDER BY username LIMIT 20",(s['user_id'],pattern)).fetchall(); conn.close()
            users=[]
            for row in rows:
                item={'id':row['id'],'username':row['username'],'shareActivity':False}
                data_conn=db(); data_row=data_conn.execute('SELECT data FROM user_data WHERE user_id=?',(row['id'],)).fetchone(); data_conn.close()
                try: item['shareActivity']=json.loads(data_row['data']).get('shareActivity',False) is True
                except (TypeError, ValueError): pass
                users.append(item)
            return json_response(self,200,{'users':users})
        if path == '/api/following':
            s=current_session(self)
            if not s: return json_response(self,401,{'error':'Not logged in'})
            conn=db(); rows=conn.execute('''SELECT u.id,u.username
                FROM follows f JOIN users u ON u.id=f.following_id
                WHERE f.follower_id=? ORDER BY u.username''',(s['user_id'],)).fetchall(); conn.close()
            users=[]
            for row in rows:
                item={'id':row['id'],'username':row['username'],'shareActivity':False}
                data_conn=db(); data_row=data_conn.execute('SELECT data FROM user_data WHERE user_id=?',(row['id'],)).fetchone(); data_conn.close()
                try: item['shareActivity']=json.loads(data_row['data']).get('shareActivity',False) is True
                except (TypeError, ValueError): pass
                users.append(item)
            return json_response(self,200,{'users':users})
        if path == '/api/activity/feed':
            s=current_session(self)
            if not s: return json_response(self,401,{'error':'Not logged in'})
            conn=db(); rows=conn.execute('''SELECT u.id AS user_id,u.username,a.log_date,a.calories,a.maintenance_calories,a.updated_at,d.data
                FROM daily_activity a JOIN users u ON u.id=a.user_id
                JOIN user_data d ON d.user_id=a.user_id
                LEFT JOIN follows f ON f.following_id=a.user_id AND f.follower_id=?
                WHERE f.following_id IS NOT NULL OR a.user_id=?
                ORDER BY a.log_date DESC,a.updated_at DESC LIMIT 50''',(s['user_id'],s['user_id'])).fetchall(); conn.close()
            activity=[]
            for row in rows:
                try:
                    sharing_enabled=json.loads(row['data']).get('shareActivity', False) is True
                except (TypeError, ValueError):
                    sharing_enabled=False
                if not sharing_enabled:
                    cleanup=db(); cleanup.execute('DELETE FROM daily_activity WHERE user_id=?', (row['user_id'],)); cleanup.commit(); cleanup.close()
                    continue
                item=dict(row); item.pop('data', None); activity.append(item)
            return json_response(self,200,{'activity':activity})
        return json_response(self,404,{'error':'Not found'})

    def do_POST(self):
        path=urlparse(self.path).path
        try: data=read_json(self)
        except Exception as e: return json_response(self,400,{'error':'Invalid JSON'})
        if path == '/api/signup':
            username=clean_username(data.get('username')); password=str(data.get('password') or '')
            if not valid_credentials(username,password): return json_response(self,400,{'error':'Username must be 3–40 characters using letters, numbers, ., _ or -. Password must be at least 6 characters.'})
            salt,pw_hash=hash_password(password)
            conn=db()
            try:
                cur=conn.execute('INSERT INTO users(username,password_hash,password_salt) VALUES(?,?,?)',(username,pw_hash,salt)); uid=cur.lastrowid
                conn.execute('INSERT INTO user_data(user_id,data) VALUES(?,?)',(uid,json.dumps(DEFAULT_DATA,separators=(',',':')))); conn.commit()
            except sqlite3.IntegrityError:
                conn.close(); return json_response(self,409,{'error':'That username is already taken.'})
            conn.close(); token=create_session(uid,username)
            return json_response(self,200,{'user':{'username':username}}, {'Set-Cookie':f'session={token}; HttpOnly; SameSite=Lax; Path=/; Max-Age={SESSION_MAX_AGE_SECONDS}'})
        if path == '/api/login':
            username=clean_username(data.get('username')); password=str(data.get('password') or '')
            conn=db(); row=conn.execute('SELECT id,username,password_hash,password_salt FROM users WHERE username=? COLLATE NOCASE',(username,)).fetchone(); conn.close()
            if not row or not verify_password(password,row['password_salt'],row['password_hash']): return json_response(self,401,{'error':'Invalid username or password.'})
            token=create_session(row['id'],row['username'])
            return json_response(self,200,{'user':{'username':row['username']}}, {'Set-Cookie':f'session={token}; HttpOnly; SameSite=Lax; Path=/; Max-Age={SESSION_MAX_AGE_SECONDS}'})
        if path == '/api/logout':
            raw=self.headers.get('Cookie',''); jar=cookies.SimpleCookie(); jar.load(raw); token=jar.get('session')
            if token: destroy_session(token.value)
            return json_response(self,200,{'ok':True},{'Set-Cookie':'session=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/'})
        if path.startswith('/api/follows/'):
            s=current_session(self)
            if not s: return json_response(self,401,{'error':'Not logged in'})
            try: following_id=int(path.rsplit('/',1)[1])
            except ValueError: return json_response(self,400,{'error':'Invalid user'})
            if following_id == s['user_id']: return json_response(self,400,{'error':'You cannot follow yourself'})
            conn=db()
            if not conn.execute('SELECT id FROM users WHERE id=?',(following_id,)).fetchone(): conn.close(); return json_response(self,404,{'error':'User not found'})
            conn.execute('INSERT OR IGNORE INTO follows(follower_id,following_id) VALUES(?,?)',(s['user_id'],following_id)); conn.commit(); conn.close()
            return json_response(self,200,{'ok':True})
        return json_response(self,404,{'error':'Not found'})

    def do_PUT(self):
        path=urlparse(self.path).path
        if path != '/api/data': return json_response(self,404,{'error':'Not found'})
        s=current_session(self)
        if not s: return json_response(self,401,{'error':'Not logged in'})
        try: data=read_json(self)
        except Exception: return json_response(self,400,{'error':'Invalid JSON'})
        if not isinstance(data,dict): return json_response(self,400,{'error':'Invalid data'})
        # Keep the same simple JSON shape used by the app.
        safe={
            'ingredients': data.get('ingredients',[]),
            'foods': data.get('foods',[]),
            'groups': data.get('groups',[]),
            'logs': data.get('logs',{}),
            'maintenanceCal': data.get('maintenanceCal',2200),
            'showKcal': data.get('showKcal',True),
            'weightUnit': data.get('weightUnit','kg'),
            'allowPreviousDayLocking': data.get('allowPreviousDayLocking',False),
            'shareActivity': data.get('shareActivity',False)
        }
        try: encoded=json.dumps(safe,separators=(',',':'))
        except Exception: return json_response(self,400,{'error':'Data could not be saved'})
        conn=db(); conn.execute('''INSERT INTO user_data(user_id,data,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data, updated_at=CURRENT_TIMESTAMP''',(s['user_id'],encoded))
        if safe['shareActivity']:
            update_activity(conn,s['user_id'],safe)
        else:
            conn.execute('DELETE FROM daily_activity WHERE user_id=?', (s['user_id'],))
        conn.commit(); conn.close()
        return json_response(self,200,{'ok':True})

    def do_DELETE(self):
        path=urlparse(self.path).path
        if path == '/api/account':
            s=current_session(self)
            if not s: return json_response(self,401,{'error':'Not logged in'})
            try: data=read_json(self)
            except Exception: return json_response(self,400,{'error':'Invalid JSON'})
            password=str(data.get('password') or '')
            conn=db(); row=conn.execute('SELECT password_hash,password_salt FROM users WHERE id=?',(s['user_id'],)).fetchone()
            if not row or not verify_password(password,row['password_salt'],row['password_hash']):
                conn.close(); return json_response(self,401,{'error':'Invalid password'})
            try:
                conn.execute('BEGIN')
                conn.execute('DELETE FROM users WHERE id=?',(s['user_id'],))
                conn.commit()
            except Exception:
                conn.rollback(); conn.close(); return json_response(self,500,{'error':'Account could not be deleted'})
            conn.close()
            raw=self.headers.get('Cookie',''); jar=cookies.SimpleCookie(); jar.load(raw); token=jar.get('session')
            if token: destroy_session(token.value)
            return json_response(self,200,{'ok':True},{'Set-Cookie':'session=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/'})
        if not path.startswith('/api/follows/'):
            return json_response(self,404,{'error':'Not found'})
        s=current_session(self)
        if not s: return json_response(self,401,{'error':'Not logged in'})
        try: following_id=int(path.rsplit('/',1)[1])
        except ValueError: return json_response(self,400,{'error':'Invalid user'})
        conn=db(); conn.execute('DELETE FROM follows WHERE follower_id=? AND following_id=?',(s['user_id'],following_id)); conn.commit(); conn.close()
        return json_response(self,200,{'ok':True})

# Main entry point
if __name__ == '__main__':
    init_db()
    load_sessions()
    print(f'Meal Builder running at http://{HOST}:{PORT}')
    print(f'SQLite database: {DB_PATH}')
    ThreadingHTTPServer((HOST,PORT),Handler).serve_forever()
#!/usr/bin/env python3
import json, os, secrets, hashlib, hmac, sqlite3
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
from http import cookies

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'meal_builder.sqlite3')
HTML_PATH = os.path.join(BASE_DIR, 'index.html')
HOST = '127.0.0.1'
PORT = 5500
SESSIONS = {}

# Static assets: only files under these top-level directories are served,
# and only with these extensions, to keep this a narrow allowlist rather
# than a general-purpose file server.
STATIC_DIRS = {'css', 'js'}
STATIC_CONTENT_TYPES = {
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
}

DEFAULT_DATA = {
    'ingredients': [],
    'meals': [],
    'snacks': [
        {'id':'snack-apple','name':'Apple','kcal':95},
        {'id':'snack-banana','name':'Banana','kcal':105},
        {'id':'snack-orange','name':'Orange','kcal':62},
        {'id':'snack-sardines','name':'Sardines (tin)','kcal':220}
    ],
    'logs': {},
    'maintenanceCal': 2200
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
    ''')
    conn.commit(); conn.close()

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
    return token

def current_session(handler):
    raw = handler.headers.get('Cookie', '')
    jar = cookies.SimpleCookie(); jar.load(raw)
    token = jar.get('session')
    if not token: return None
    return SESSIONS.get(token.value)

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
    """Map a request path like /css/base.css to a file on disk, restricted
    to STATIC_DIRS and STATIC_CONTENT_TYPES. Returns None if the path isn't
    a servable static asset (including any attempt to escape BASE_DIR)."""
    parts = [p for p in url_path.split('/') if p not in ('', '.')]
    if len(parts) < 2 or parts[0] not in STATIC_DIRS: return None
    if any(p == '..' for p in parts): return None
    ext = os.path.splitext(parts[-1])[1].lower()
    if ext not in STATIC_CONTENT_TYPES: return None
    full_path = os.path.normpath(os.path.join(BASE_DIR, *parts))
    if not full_path.startswith(BASE_DIR + os.sep): return None
    if not os.path.isfile(full_path): return None
    return full_path, STATIC_CONTENT_TYPES[ext]

def serve_static_file(handler, full_path, content_type):
    with open(full_path, 'rb') as f: body = f.read()
    handler.send_response(200)
    handler.send_header('Content-Type', content_type)
    handler.send_header('Content-Length', str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)

class Handler(BaseHTTPRequestHandler):
    server_version = 'MealBuilderSQLite/1.0'

    def log_message(self, fmt, *args):
        print('%s - %s' % (self.address_string(), fmt % args))

    def do_GET(self):
        path = urlparse(self.path).path
        if path == '/':
            try:
                with open(HTML_PATH, 'rb') as f: body = f.read()
            except FileNotFoundError:
                return json_response(self, 500, {'error':'index_sqlite.html not found'})
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
            return json_response(self,200,{'user':{'username':username}}, {'Set-Cookie':f'session={token}; HttpOnly; SameSite=Lax; Path=/'})
        if path == '/api/login':
            username=clean_username(data.get('username')); password=str(data.get('password') or '')
            conn=db(); row=conn.execute('SELECT id,username,password_hash,password_salt FROM users WHERE username=? COLLATE NOCASE',(username,)).fetchone(); conn.close()
            if not row or not verify_password(password,row['password_salt'],row['password_hash']): return json_response(self,401,{'error':'Invalid username or password.'})
            token=create_session(row['id'],row['username'])
            return json_response(self,200,{'user':{'username':row['username']}}, {'Set-Cookie':f'session={token}; HttpOnly; SameSite=Lax; Path=/'})
        if path == '/api/logout':
            raw=self.headers.get('Cookie',''); jar=cookies.SimpleCookie(); jar.load(raw); token=jar.get('session')
            if token: SESSIONS.pop(token.value,None)
            return json_response(self,200,{'ok':True},{'Set-Cookie':'session=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/'})
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
            'meals': data.get('meals',[]),
            'snacks': data.get('snacks',[]),
            'logs': data.get('logs',{}),
            'maintenanceCal': data.get('maintenanceCal',2200)
        }
        try: encoded=json.dumps(safe,separators=(',',':'))
        except Exception: return json_response(self,400,{'error':'Data could not be saved'})
        conn=db(); conn.execute('''INSERT INTO user_data(user_id,data,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data, updated_at=CURRENT_TIMESTAMP''',(s['user_id'],encoded)); conn.commit(); conn.close()
        return json_response(self,200,{'ok':True})

# Main entry point
if __name__ == '__main__':
    init_db()
    print(f'Meal Builder running at http://{HOST}:{PORT}')
    print(f'SQLite database: {DB_PATH}')
    ThreadingHTTPServer((HOST,PORT),Handler).serve_forever()
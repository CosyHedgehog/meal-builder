#!/usr/bin/env python3
import hmac
import hashlib
import json
import os
import subprocess
import threading
from datetime import datetime
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEPLOY_SCRIPT = os.path.join(BASE_DIR, 'deploy.sh')
LOG_FILE = os.path.join(BASE_DIR, 'webhook.log')
SECRET = os.environ.get('GITHUB_WEBHOOK_SECRET', '')
PORT = int(os.environ.get('WEBHOOK_PORT', '9000'))
EXPECTED_BRANCH = os.environ.get('WEBHOOK_BRANCH', 'main')
LOCK = threading.Lock()

if not SECRET:
    raise RuntimeError('GITHUB_WEBHOOK_SECRET must be set in the environment')


def log(message):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    line = f'{timestamp} {message}\n'
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(line)
    print(line, end='')


def verify_signature(secret, signature, payload):
    if not signature or not signature.startswith('sha256='):
        return False
    mac = hmac.new(secret.encode('utf-8'), payload, hashlib.sha256)
    expected = mac.hexdigest()
    return hmac.compare_digest(expected, signature.split('=', 1)[1])


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path not in ('/', '/payload', '/github-webhook'):
            self.send_response(404)
            self.end_headers()
            return

        length = int(self.headers.get('Content-Length', '0'))
        payload = self.rfile.read(length)
        signature = self.headers.get('X-Hub-Signature-256', '')
        event = self.headers.get('X-GitHub-Event', '')

        if event != 'push':
            self.send_response(202)
            self.end_headers()
            return

        if not verify_signature(SECRET, signature, payload):
            log('Invalid GitHub signature')
            self.send_response(403)
            self.end_headers()
            return

        try:
            body = json.loads(payload.decode('utf-8'))
        except json.JSONDecodeError:
            log('Invalid JSON payload')
            self.send_response(400)
            self.end_headers()
            return

        ref = body.get('ref', '')
        if ref != f'refs/heads/{EXPECTED_BRANCH}':
            log(f'Ignored push event for ref {ref}')
            self.send_response(202)
            self.end_headers()
            return

        with LOCK:
            log(f'Received push to {ref}; running deploy script')
            try:
                subprocess.run([DEPLOY_SCRIPT], cwd=BASE_DIR, check=True)
                log('Deploy script completed successfully')
                self.send_response(200)
            except subprocess.CalledProcessError as exc:
                log(f'Deploy script failed: {exc}')
                self.send_response(500)
            except Exception as exc:
                log(f'Unexpected error: {exc}')
                self.send_response(500)
            finally:
                self.end_headers()

    def log_message(self, format, *args):
        return


if __name__ == '__main__':
    server = ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    log(f'Webhook listener running on 127.0.0.1:{PORT} for branch {EXPECTED_BRANCH}')
    server.serve_forever()

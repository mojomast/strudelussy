#!/usr/bin/env python3

from __future__ import annotations

import http.client
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit


HOST = "127.0.0.1"
PORT = 9511
API_BASE = "http://127.0.0.1:8788"
DIST_DIR = "/home/mojo/projects/strudelussy/ui/dist"


class PublicProxyHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_OPTIONS(self):
        if self.path.startswith("/api/"):
            self._proxy_request()
            return
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/api/"):
            self._proxy_request()
            return

        path = self.translate_path(self.path.split("?", 1)[0].split("#", 1)[0])
        if os.path.exists(path) and not os.path.isdir(path):
            super().do_GET()
            return

        self.path = "/index.html"
        super().do_GET()

    def do_HEAD(self):
        if self.path.startswith("/api/"):
            self._proxy_request()
            return
        super().do_HEAD()

    def do_POST(self):
        self._proxy_request()

    def do_PUT(self):
        self._proxy_request()

    def do_DELETE(self):
        self._proxy_request()

    def _proxy_request(self):
        target = urlsplit(API_BASE)
        connection = http.client.HTTPConnection(target.hostname, target.port)

        content_length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(content_length) if content_length else None

        headers = {key: value for key, value in self.headers.items()}
        headers["Host"] = target.netloc
        headers["X-Forwarded-Proto"] = "https"
        headers["X-Forwarded-Host"] = self.headers.get("Host", "strudel.ussyco.de")

        connection.request(self.command, self.path, body=body, headers=headers)
        response = connection.getresponse()
        payload = response.read()

        self.send_response(response.status)
        for key, value in response.getheaders():
            if key.lower() in {"transfer-encoding", "connection", "keep-alive"}:
                continue
            self.send_header(key, value)
        self.end_headers()

        if self.command != "HEAD":
            self.wfile.write(payload)


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), PublicProxyHandler)
    print(f"Public proxy serving on http://{HOST}:{PORT}")
    server.serve_forever()

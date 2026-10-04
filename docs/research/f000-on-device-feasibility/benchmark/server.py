# Static files + POST /results/<name> -> results/<name>. Bound to 127.0.0.1 only.
import http.server, os
class H(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        name = os.path.basename(self.path)
        assert self.path.startswith('/results/') and name.endswith('.json')
        open(os.path.join('results', name), 'wb').write(self.rfile.read(int(self.headers['Content-Length'])))
        self.send_response(204); self.end_headers()
http.server.ThreadingHTTPServer(('127.0.0.1', 8766), H).serve_forever()

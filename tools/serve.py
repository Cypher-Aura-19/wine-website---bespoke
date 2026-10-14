# Local preview server: like `python -m http.server 8123`, but missing pages get the site's own 404.html,
# as they will on the real host.
import http.server, os, functools
ROOT = 'C:/Users/HP/Desktop/Galvan ai projects/wine website'

class Handler(http.server.SimpleHTTPRequestHandler):
    def send_error(self, code, message=None, explain=None):
        page = os.path.join(ROOT, '404.html')
        if code == 404 and os.path.exists(page):
            body = open(page, 'rb').read()
            self.send_response(404)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            if self.command != 'HEAD': self.wfile.write(body)
            return
        super().send_error(code, message, explain)

if __name__ == '__main__':
    http.server.ThreadingHTTPServer(('', 8123), functools.partial(Handler, directory=ROOT)).serve_forever()

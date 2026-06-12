from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        super().end_headers()


if __name__ == "__main__":
    root = Path(__file__).resolve().parent
    import os

    os.chdir(root)
    server = ThreadingHTTPServer(("127.0.0.1", 8765), Handler)
    print("Serving hand preview at http://127.0.0.1:8765")
    server.serve_forever()

"""
server.py — compatibility launcher (historical entry point)
===========================================================

This file used to contain the old stdlib http.server implementation. That
logic now lives in app.py (Flask + SQLite) together with real authentication.

For backwards compatibility `python server.py` still starts the server
exactly like `python app.py` does — so older docs, muscle memory and
start scripts keep working instead of exiting with an error and leaving
http://localhost:8765 unreachable.
"""

import os
import runpy
import sys


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    target = os.path.join(here, "app.py")
    print("[NOTICE] server.py is the legacy entry point.")
    print("[NOTICE] Starting app.py instead — the real Flask backend.")
    print("[NOTICE] Prefer `python app.py` going forward.\n")
    sys.argv[0] = target
    runpy.run_path(target, run_name="__main__")


if __name__ == "__main__":
    main()

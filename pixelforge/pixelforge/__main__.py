"""Allow ``python -m pixelforge`` to work.

Delegates to the real CLI entry point in ``pixelforge.cli.__main__``.
"""
from pixelforge.cli.__main__ import main

raise SystemExit(main())
# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec for project-helper backend."""

block_cipher = None

a = Analysis(
    ['run_backend.py'],
    pathex=[],
    binaries=[],
    datas=[('app', 'app')],
    hiddenimports=[
        'langchain', 'langchain_openai', 'langchain_core',
        'langchain_core.tools', 'langchain_core.language_models',
        'langchain_core.messages', 'langchain_core.prompts',
        'httpx', 'httpcore',
        'pydantic', 'pydantic_core', 'dotenv',
        'fastapi', 'uvicorn', 'uvicorn.logging', 'uvicorn.loops',
        'uvicorn.loops.auto', 'uvicorn.protocols',
        'uvicorn.protocols.http', 'uvicorn.protocols.http.auto',
        'starlette', 'anyio',
        'sqlite3',
        'asyncio', 'json', 'hashlib', 're', 'shutil',
        'subprocess', 'pathlib', 'argparse', 'logging',
        'langchain_community', 'openai',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter', 'matplotlib', 'numpy', 'pandas',
        'scipy', 'PIL', 'cv2', 'tensorflow', 'torch',
        'jedi', 'IPython', 'jupyter',
        'setuptools', 'pip', 'wheel', 'pkg_resources',
        # Qt bindings (conflict when multiple present)
        'PyQt5', 'PyQt6', 'PySide2', 'PySide6', 'qtpy',
        # Other GUI frameworks
        'wx', 'traitlets', 'ipykernel', 'zmq',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch='x86_64',
    codesign_identity=None,
    entitlements_file=None,
    icon='../electron/resources/icon.ico',
)

# Bundle into directory for Electron extraResources
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='backend',
)

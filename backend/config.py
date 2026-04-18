import os
import sys
from pathlib import Path

# When bundled with PyInstaller --onefile, files are extracted to sys._MEIPASS
if getattr(sys, 'frozen', False):
    _BACKEND_DIR = Path(sys._MEIPASS)
else:
    _BACKEND_DIR = Path(__file__).parent

_PROJECT_ROOT = _BACKEND_DIR.parent
FONTS_DIR = _BACKEND_DIR / 'fonts'

DATA_DIR = Path(os.environ.get('CRISIS_DATA_DIR', _PROJECT_ROOT / 'data'))
SESSIONS_DIR = DATA_DIR / 'sessions'
TESTS_DIR = DATA_DIR / 'tests'
AVATARS_DIR = DATA_DIR / 'avatars'
USER_FILE = DATA_DIR / 'user.json'
TOPICS_FILE = TESTS_DIR / 'topics.json'

HOST = os.environ.get('CRISIS_HOST', '127.0.0.1')
PORT = int(os.environ.get('CRISIS_PORT', '8000'))

# Admin credentials (stored here, not in data files)
ADMIN_LOGIN = 'admin'
ADMIN_PASSWORD = 'admin'

"""
CyberDaddy - PythonAnywhere WSGI Configuration
============================================================
PASTE THE ENTIRE CONTENT OF THIS FILE into the PythonAnywhere
WSGI configuration file at:
    /var/www/yourusername_pythonanywhere_com_wsgi.py

Replace:
    - /home/yourusername  →  your actual PythonAnywhere home dir
    - yourusername        →  your actual PythonAnywhere username

After editing, click "Reload" in the PythonAnywhere Web tab.
"""

import sys
import os

# ── Step 1: Add project root to Python path ────────────────
# Replace 'yourusername' with your actual PythonAnywhere username
PROJECT_HOME = '/home/yourusername/CyberDaddy'

if PROJECT_HOME not in sys.path:
    sys.path.insert(0, PROJECT_HOME)

# ── Step 2: Activate virtualenv ────────────────────────────
# Replace 'yourusername' and Python version as needed
VENV_ACTIVATE = '/home/yourusername/.virtualenvs/cyberdaddy/bin/activate_this.py'
if os.path.exists(VENV_ACTIVATE):
    with open(VENV_ACTIVATE) as f:
        exec(f.read(), {'__file__': VENV_ACTIVATE})

# ── Step 3: Set the settings module ────────────────────────
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.pythonanywhere'

# ── Step 4: Load environment variables from .env ───────────
# python-decouple will auto-find .env in the project root.
# Alternatively you can set them in the PythonAnywhere Web tab
# under "Environment variables" section.

# ── Step 5: Create the WSGI application ────────────────────
from django.core.wsgi import get_wsgi_application  # noqa
application = get_wsgi_application()

import sys
import os

PROJECT_HOME = '/home/Arghyajyotighosh/CyberDaddy'
if PROJECT_HOME not in sys.path:
    sys.path.insert(0, PROJECT_HOME)

VENV_ACTIVATE = '/home/Arghyajyotighosh/CyberDaddy/venv/bin/activate_this.py'
if os.path.exists(VENV_ACTIVATE):
    with open(VENV_ACTIVATE) as f:
        exec(f.read(), {'__file__': VENV_ACTIVATE})

os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.pythonanywhere'

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()

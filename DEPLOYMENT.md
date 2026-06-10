# CyberDaddy — PythonAnywhere Deployment Guide

## 🎯 Deployment Strategy
- **Backend**: PythonAnywhere (Django + SQLite + WhiteNoise)  
- **Frontend**: Vercel (Next.js)  
- **AI**: Groq API (faster + cheaper than OpenAI for demo)  
- **Auth**: JWT via `djangorestframework-simplejwt`  
- **Queue**: Synchronous (Celery disabled for MVP)

---

## 📋 Pre-Deployment Checklist

Before starting, make sure you have:
- [ ] A PythonAnywhere account (free at https://www.pythonanywhere.com)
- [ ] Your Groq API key from https://console.groq.com/keys  
- [ ] A Vercel account (free at https://vercel.com)
- [ ] Git or access to upload files

---

## 🛠 PART 1: Backend on PythonAnywhere

### Step 1 — Upload Your Code

**Option A: Git Clone (Recommended)**
```bash
# In PythonAnywhere Bash console:
git clone https://github.com/yourusername/CyberDaddy.git ~/CyberDaddy
```

**Option B: Upload via Files tab**
- Zip the project (exclude `node_modules/`, `.next/`, `venv/`, `__pycache__/`)
- Upload and unzip in your home directory

---

### Step 2 — Create a Virtual Environment

```bash
# In PythonAnywhere Bash console:
cd ~/CyberDaddy
python3.12 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements-pythonanywhere.txt
```

> ⚠️ **PythonAnywhere free tier supports Python 3.10, 3.11, 3.12.** 
> Use `python3.12` if available, otherwise `python3.11`.

---

### Step 3 — Configure Environment Variables

```bash
# Copy the template
cp .env.pythonanywhere .env

# Edit the .env file
nano .env
```

Fill in these **required** values:

```env
SECRET_KEY=<generate with: python -c "import secrets; print(secrets.token_urlsafe(50))">
ALLOWED_HOSTS=yourusername.pythonanywhere.com
DJANGO_SETTINGS_MODULE=config.settings.pythonanywhere
GROQ_API_KEY=gsk_<your-groq-api-key>
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://your-app.vercel.app
FRONTEND_URL=https://your-app.vercel.app
CSRF_TRUSTED_ORIGINS=https://yourusername.pythonanywhere.com,https://your-app.vercel.app
```

---

### Step 4 — Run Database Migrations

```bash
source venv/bin/activate
export DJANGO_SETTINGS_MODULE=config.settings.pythonanywhere

python manage.py migrate --settings=config.settings.pythonanywhere
```

Expected output: All migrations applied successfully.

---

### Step 5 — Collect Static Files

```bash
python manage.py collectstatic --settings=config.settings.pythonanywhere --noinput
```

This creates a `staticfiles/` directory in your project root.

---

### Step 6 — Create a Superuser (Admin Account)

```bash
python manage.py createsuperuser --settings=config.settings.pythonanywhere
```

Enter email, name, and password for your admin account.

---

### Step 7 — Create Media Directory

```bash
mkdir -p ~/CyberDaddy/media/scan_files
chmod 755 ~/CyberDaddy/media
```

---

### Step 8 — Configure PythonAnywhere Web App

1. Go to **Web** tab in PythonAnywhere dashboard
2. Click **"Add a new web app"**
3. Choose **"Manual configuration"** (NOT Django)
4. Choose **Python 3.12** (or 3.11)
5. Click Next

**Set Virtual Environment Path:**
```
/home/yourusername/CyberDaddy/venv
```

**Set Working Directory:**
```
/home/yourusername/CyberDaddy
```

---

### Step 9 — Configure WSGI File

1. In the Web tab, click on the **WSGI configuration file** link
   (e.g., `/var/www/yourusername_pythonanywhere_com_wsgi.py`)
2. **Delete all existing content**
3. Paste the entire content from `pythonanywhere_wsgi.py`
4. Replace `yourusername` with your actual username
5. Save

---

### Step 10 — Configure Static Files in PythonAnywhere

In the **Web** tab, under **Static files**, add:

| URL | Directory |
|-----|-----------|
| `/static/` | `/home/yourusername/CyberDaddy/staticfiles` |
| `/media/` | `/home/yourusername/CyberDaddy/media` |

---

### Step 11 — Reload & Test Backend

1. Click **"Reload yourusername.pythonanywhere.com"**
2. Test these URLs in your browser:

| URL | Expected |
|-----|----------|
| `https://yourusername.pythonanywhere.com/api/v1/health/` | `{"status": "ok"}` |
| `https://yourusername.pythonanywhere.com/api/docs/` | Swagger UI |
| `https://yourusername.pythonanywhere.com/admin/` | Admin login |

If you see errors, check logs at:
```
/home/yourusername/.virtualenvs/ (or check Error log in Web tab)
~/logs/cyberdaddy.log
```

---

## 🌐 PART 2: Frontend on Vercel

### Step 12 — Update Frontend API URL

In `frontend/.env.production`, set:
```env
NEXT_PUBLIC_API_URL=https://yourusername.pythonanywhere.com/api/v1
NEXT_PUBLIC_GROQ_API_KEY=gsk_your_groq_key_here
```

### Step 13 — Deploy to Vercel

**Option A: Via Vercel CLI**
```bash
cd frontend
npx vercel --prod
```

**Option B: Via Vercel Dashboard**
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Set **Root Directory** to `frontend`
4. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL` = `https://yourusername.pythonanywhere.com/api/v1`
   - `NEXT_PUBLIC_GROQ_API_KEY` = your Groq API key
   - `NEXT_PUBLIC_APP_NAME` = `CyberDaddy`
5. Click **Deploy**

### Step 14 — Update CORS in Django

After getting your Vercel URL (e.g., `https://cyberdaddy.vercel.app`):

1. SSH into PythonAnywhere Bash console
2. Edit `.env` and update:
   ```env
   CORS_ALLOWED_ORIGINS=https://cyberdaddy.vercel.app,http://localhost:3000
   FRONTEND_URL=https://cyberdaddy.vercel.app
   CSRF_TRUSTED_ORIGINS=https://yourusername.pythonanywhere.com,https://cyberdaddy.vercel.app
   ```
3. Reload the web app

---

## ✅ PART 3: Health Check & Verification

### Backend API Tests

```bash
# 1. Health check
curl https://yourusername.pythonanywhere.com/api/v1/health/

# 2. Register a user
curl -X POST https://yourusername.pythonanywhere.com/api/v1/users/register/ \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "full_name": "Test User", "password": "SecurePass123!"}'

# 3. Login and get JWT token
curl -X POST https://yourusername.pythonanywhere.com/api/v1/users/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "SecurePass123!"}'
# → Copy the access_token from the response

# 4. Test a protected API endpoint
curl -H "Authorization: Bearer <access_token>" \
  https://yourusername.pythonanywhere.com/api/v1/users/me/

# 5. Test Groq AI integration (text scan)
curl -X POST https://yourusername.pythonanywhere.com/api/v1/scans/text/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"scan_type": "sms", "content": "Congratulations! You have won Rs 50,000. Click here to claim: bit.ly/claim-prize"}'
```

### Frontend Tests
1. Open `https://your-app.vercel.app`
2. Register a new account
3. Log in
4. Test chat interface (Groq AI)
5. Upload a screenshot for analysis

---

## ⚠️ Known Limitations (PythonAnywhere MVP)

| Limitation | Impact | Workaround |
|------------|--------|------------|
| No Celery | Scans run synchronously | Response takes 3-8 seconds instead of being async |
| No Redis | No shared cache between workers | LocMemCache resets on reload |
| SQLite | No concurrent writes | Fine for demo with few users |
| No email sending | Console backend (email prints to log) | Show in logs during demo |
| No S3 | Files stored locally | May be lost on PA restarts (use paid tier) |
| CPU limits (free tier) | May throttle heavy requests | Upgrade to paid for demo day |
| No WebSockets | Real-time features disabled | Not needed for MVP |
| 512MB storage (free) | Limited file uploads | Upgrade if needed |

---

## 🔍 Troubleshooting

### Error: `ModuleNotFoundError: No module named 'celery'`
→ You're using the wrong requirements file. Run:
```bash
pip install -r requirements-pythonanywhere.txt
```

### Error: `django.db.utils.OperationalError: no such column`
→ Migrations not run. Execute:
```bash
python manage.py migrate --settings=config.settings.pythonanywhere
```

### Error: `CORS: No 'Access-Control-Allow-Origin' header`
→ Update `.env` with the correct Vercel URL in `CORS_ALLOWED_ORIGINS` and reload.

### Error: `502 Bad Gateway` on PythonAnywhere
→ Check WSGI file. Ensure path is correct. View error log in Web tab.

### Groq API Error: `Invalid API Key`
→ Double-check `GROQ_API_KEY` in `.env`. Get a key from https://console.groq.com/keys

### Static files not loading (CSS broken)
→ Run `python manage.py collectstatic` and ensure the static files mapping is correct in PA Web tab.

---

## 🚀 Production Migration Path (Post-Demo)

For production on **Render.com** + **Neon PostgreSQL** + **Redis Cloud**:

1. **Database**: Migrate from SQLite to Neon PostgreSQL (free tier available)
   ```bash
   # Export SQLite data
   python manage.py dumpdata > data_backup.json
   # Import to PostgreSQL after migration
   python manage.py loaddata data_backup.json
   ```

2. **Redis**: Enable Redis Cloud (free 30MB tier), update `CACHE_URL` and `CELERY_BROKER_URL`

3. **Celery**: Re-enable by removing `CELERY_TASK_ALWAYS_EAGER=True`

4. **S3/R2**: Set up Cloudflare R2 (cheaper than S3) for media storage

5. **Deploy**: Use `render.yaml` with web service + worker service

6. **Estimated monthly cost**: ~$10-25/month for production scale

---

## 📁 Files Created/Modified Summary

### New Files
- `config/settings/pythonanywhere.py` — PythonAnywhere-specific settings
- `requirements-pythonanywhere.txt` — Slim requirements (no Celery/Redis/S3)
- `pythonanywhere_wsgi.py` — WSGI config to paste into PA dashboard
- `.env.pythonanywhere` — Environment variable template
- `frontend/.env.production` — Frontend production env for Vercel
- `frontend/vercel.json` — Vercel deployment config
- `DEPLOYMENT.md` — This file

### Modified Files
- `config/__init__.py` — Made Celery import optional (try/except)
- `config/settings/base.py` — Removed module-level `sentry_sdk` import
- `apps/scam_detection/services.py` — Synchronous scan processing + Groq API
- `apps/scam_detection/tasks.py` — Conditional async/sync notification calls
- `apps/users/services.py` — Synchronous email task calls
- `apps/users/views.py` — Conditional async/sync task calls
- `apps/payments/views.py` — Conditional async/sync webhook tasks
- `apps/ai_insights/tasks.py` — Conditional async/sync + Groq support
- `apps/threat_intelligence/models.py` — Conditional GinIndex (PostgreSQL-only)

---

## 🔑 Environment Variables Quick Reference

| Variable | Required | Example |
|----------|----------|---------|
| `SECRET_KEY` | ✅ Yes | 50-char random string |
| `ALLOWED_HOSTS` | ✅ Yes | `yourusername.pythonanywhere.com` |
| `GROQ_API_KEY` | ✅ Yes | `gsk_...` |
| `CORS_ALLOWED_ORIGINS` | ✅ Yes | Vercel URL |
| `CSRF_TRUSTED_ORIGINS` | ✅ Yes | PA + Vercel URLs |
| `FRONTEND_URL` | ✅ Yes | Vercel URL |
| `DEBUG` | ❌ No | `False` (default) |
| `OPENAI_API_KEY` | Optional | For GPT-4o Vision fallback |

---

*Generated by Antigravity AI — CyberDaddy MVP Deployment Preparation*

#!/bin/bash
# ============================================================
# Docker Entrypoint Script for CyberDaddy
# ============================================================
set -e

echo "============================================"
echo "  CyberDaddy API Server Starting..."
echo "============================================"

# Wait for PostgreSQL
echo "Waiting for PostgreSQL..."
while ! pg_isready -h "${DB_HOST:-postgres}" -p "${DB_PORT:-5432}" -U "${DB_USER:-cyberdaddy_user}" > /dev/null 2>&1; do
    sleep 1
done
echo "PostgreSQL is ready."

# Run database migrations
echo "Running migrations..."
python manage.py migrate --noinput

# Collect static files (production only)
if [ "$DJANGO_SETTINGS_MODULE" = "config.settings.production" ]; then
    echo "Collecting static files..."
    python manage.py collectstatic --noinput --clear
fi

# Create superuser if needed (first boot)
if [ "${CREATE_SUPERUSER:-false}" = "true" ]; then
    echo "Creating superuser..."
    python manage.py createsuperuser --noinput || true
fi

echo "Starting application..."
exec "$@"

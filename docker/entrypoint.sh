#!/bin/bash

set -e

echo "============================================"
echo "  CyberDaddy API Server Starting..."
echo "============================================"

# Skip pg_isready checks on Render/Supabase

# Django will validate the database connection during migrations.

echo "Checking database connection via Django..."

# Run migrations

echo "Running migrations..."
python manage.py migrate --noinput

# Collect static files

if [ "$DJANGO_SETTINGS_MODULE" = "config.settings.production" ]; then
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear
fi

# Optional superuser creation

if [ "${CREATE_SUPERUSER:-false}" = "true" ]; then
echo "Creating superuser..."
python manage.py createsuperuser --noinput || true
fi

echo "Starting Gunicorn..."
exec "$@"

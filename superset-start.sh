#!/bin/bash
set -e

echo "Running database migrations..."
superset db upgrade

echo "Initializing Superset..."
superset init

echo "Starting Gunicorn..."
exec gunicorn --bind 0.0.0.0:8088 --workers 4 --timeout 120 "superset.app:create_app()"

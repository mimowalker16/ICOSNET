@echo off
setlocal EnableDelayedExpansion

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"

echo.
echo  ==========================================
echo   ICOSNET Supervision Platform — Launcher
echo  ==========================================
echo.
echo  Architecture:
echo    Docker  — PostgreSQL, Redis, Django/Gunicorn
echo    Native  — Celery worker + beat (needs LAN access for probes)
echo.

:: ── 1. Docker services (DB + Redis + Backend) ────────────────────────────────
echo [1/3] Starting Docker services (db, redis, backend)...
docker compose -f "%ROOT%docker-compose.yml" up -d
if errorlevel 1 (
    echo [ERROR] docker compose failed. Is Docker Desktop running?
    pause
    exit /b 1
)
echo       DB      OK on localhost:5433
echo       Redis   OK on localhost:6379
echo       Backend OK on http://localhost:8000
echo.

:: Wait for DB to be ready before starting Celery
echo       Waiting 5 s for DB to be ready...
timeout /t 5 /nobreak >nul

:: ── 2. Celery (native — needs host LAN to probe 192.168.x.x addresses) ──────
echo [2/3] Starting Celery worker (native, LAN access)...
::
:: Override DB_HOST/DB_PORT/REDIS_URL so native Celery reaches
:: the Docker-exposed ports on localhost instead of the internal
:: service names ("db", "redis") that only exist inside Docker.
::
set DB_HOST=localhost
set DB_PORT=5433
set REDIS_URL=redis://localhost:6379/0

start "ICOSNET — Celery Worker" cmd /k "cd /d "%BACKEND%" && set DB_HOST=localhost&& set DB_PORT=5433&& set REDIS_URL=redis://localhost:6379/0&& python -m celery -A config worker -l info --pool=solo"
timeout /t 2 /nobreak >nul

start "ICOSNET — Celery Beat" cmd /k "cd /d "%BACKEND%" && set DB_HOST=localhost&& set DB_PORT=5433&& set REDIS_URL=redis://localhost:6379/0&& python -m celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler"
echo       Celery worker + beat running (pool=solo)
echo.

:: ── 3. Frontend (Vite) ────────────────────────────────────────────────────────
echo [3/3] Starting frontend...
start "ICOSNET — Frontend" cmd /k "cd /d "%FRONTEND%" && npm run dev"
echo       Frontend starting on http://localhost:5173
echo.

echo  ==========================================
echo   All services launched
echo  ==========================================
echo.
echo   Frontend  →  http://localhost:5173
echo   API       →  http://localhost:8000/api/
echo   Swagger   →  http://localhost:8000/api/docs/
echo   Admin     →  http://localhost:8000/admin/
echo.
echo  To stop Docker services run:  docker compose down
echo  Close the Celery windows to stop workers.
echo.
pause

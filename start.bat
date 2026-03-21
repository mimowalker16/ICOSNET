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

:: ── 1. Redis (Docker) ─────────────────────────────────────────────────────────
echo [1/4] Starting Redis...
docker start redis 2>nul || docker run -d --name redis -p 6379:6379 redis:7-alpine
if errorlevel 1 (
    echo [ERROR] Docker is not running or Redis failed to start. Aborting.
    pause
    exit /b 1
)
echo       Redis OK on redis://localhost:6379
echo.

:: ── 2. Django backend ─────────────────────────────────────────────────────────
echo [2/4] Starting Django backend...
start "ICOSNET — Django" cmd /k "cd /d "%BACKEND%" && python manage.py runserver"
timeout /t 2 /nobreak >nul
echo       Django OK on http://localhost:8000
echo.

:: ── 3. Celery worker ──────────────────────────────────────────────────────────
echo [3/4] Starting Celery worker...
start "ICOSNET — Celery Worker" cmd /k "cd /d "%BACKEND%" && python -m celery -A config worker -l info --pool=solo"
timeout /t 2 /nobreak >nul
echo       Celery worker running (pool=solo)
echo.

start "ICOSNET — Celery Beat" cmd /k "cd /d "%BACKEND%" && python -m celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler"
```> start "ICOSNET — Celery Beat" cmd /k "cd /d "%BACKEND%" && python -m celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler"

:: ── 4. Frontend (Vite) ────────────────────────────────────────────────────────
echo [4/4] Starting frontend...
start "ICOSNET — Frontend" cmd /k "cd /d "%FRONTEND%" && npm run dev"
echo       Frontend starting on http://localhost:5173
echo.

echo  ==========================================
echo   All services launched in separate windows
echo  ==========================================
echo.
echo   Django    →  http://localhost:8000
echo   API       →  http://localhost:8000/api/
echo   Admin     →  http://localhost:8000/admin/
echo   Frontend  →  http://localhost:5173
echo.
echo  To stop everything, close the terminal windows
echo  or run:  docker stop redis
echo.
pause

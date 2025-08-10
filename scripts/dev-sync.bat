@echo off
setlocal enabledelayedexpansion

REM Check Docker and Docker Compose
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed or not in PATH
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose is not installed or not in PATH
    exit /b 1
)

REM Main function
if "%~1"=="" (
    goto show_help
)

if "%~1"=="start" goto start_dev_sync
if "%~1"=="stop" goto stop_dev_sync
if "%~1"=="restart" goto restart_dev_sync
if "%~1"=="logs" goto show_logs
if "%~1"=="status" goto show_status
if "%~1"=="help" goto show_help

echo [ERROR] Unknown command: %~1
goto show_help

:show_help
echo ================================
echo   Docker Volume Real-time Sync
echo ================================
echo Usage: scripts\dev-sync.bat [command]
echo.
echo Available commands:
echo   start     - Start development environment with real-time sync
echo   stop      - Stop development environment
echo   restart   - Restart development environment
echo   logs      - View logs
echo   status    - View service status
echo   help      - Show this help
echo.
echo Real-time sync features:
echo   - Frontend code changes trigger hot reload
echo   - Backend code changes auto-restart service
echo   - No need to rebuild Docker images
echo.
echo Examples:
echo   scripts\dev-sync.bat start
echo   scripts\dev-sync.bat logs
echo   scripts\dev-sync.bat stop
exit /b 0

:start_dev_sync
echo [INFO] Starting real-time sync development environment...

if not exist ".env" (
    echo [WARNING] .env file not found, copying from .env.example
    copy .env.example .env >nul
)

echo [INFO] Starting services with development configuration...
docker-compose -f docker-compose.dev.yml up -d

echo [INFO] Waiting for services to start...
timeout /t 15 /nobreak >nul

echo [INFO] Checking service status...
docker-compose -f docker-compose.dev.yml ps

echo ================================
echo   Development Environment Ready!
echo ================================
echo Frontend (Hot Reload): http://localhost:3000
echo Backend (Auto Restart): http://localhost:8080
echo Health Check: http://localhost:8080/api/health
echo.
echo Real-time sync is enabled:
echo - Modify files in client/src for frontend hot reload
echo - Modify files in server for backend auto restart
echo - No need to rebuild Docker images
echo.
echo View real-time logs: scripts\dev-sync.bat logs
exit /b 0

:stop_dev_sync
echo [INFO] Stopping real-time sync development environment...
docker-compose -f docker-compose.dev.yml down
echo [INFO] Development environment stopped
exit /b 0

:restart_dev_sync
echo [INFO] Restarting real-time sync development environment...
call :stop_dev_sync
echo.
call :start_dev_sync
exit /b 0

:show_logs
echo [INFO] Viewing service logs...
docker-compose -f docker-compose.dev.yml logs -f
exit /b 0

:show_status
echo ================================
echo   Service Status
echo ================================
docker-compose -f docker-compose.dev.yml ps
echo.
echo Container Details:
docker ps --filter "name=fullstack_*_dev" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
exit /b 0
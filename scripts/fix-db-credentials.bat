@echo off
echo ========================================
echo Database Credentials Fix
echo ========================================
echo.
echo The correct DATABASE_URL_LOCAL should be:
echo.
echo DATABASE_URL_LOCAL=postgresql://admin:admin123@localhost:5432/aihub_db?schema=public
echo.
echo ========================================
echo Instructions:
echo ========================================
echo.
echo 1. Open the file: backend\.env.dev
echo.
echo 2. Add or update this line:
echo    DATABASE_URL_LOCAL=postgresql://admin:admin123@localhost:5432/aihub_db?schema=public
echo.
echo 3. Save the file
echo.
echo 4. Restart your NestJS application
echo.
echo ========================================
echo Quick Test:
echo ========================================
echo.
echo Test PostgreSQL connection:
echo   docker exec aihub_postgres_dev psql -U admin -d aihub_db -c "SELECT 1"
echo.
pause

@echo off
REM Automated Database Setup Script for Telescope App (Windows)

echo ==========================================
echo Telescope Database Setup
echo ==========================================
echo.

REM Check if DATABASE_URL is set
if not defined DATABASE_URL (
    echo ❌ DATABASE_URL is not set in .env file
    echo.
    echo Please add your database URL to .env:
    echo DATABASE_URL=postgresql://user:pass@host/database
    echo.
    echo Options:
    echo 1. Create free Neon database: https://neon.tech
    echo 2. Use local PostgreSQL: postgresql://postgres:postgres@localhost:5432/telescope
    exit /b 1
)

echo ✓ DATABASE_URL found
echo.

REM Run database push
echo 📊 Creating database tables...
call npm run db:push

if errorlevel 1 (
    echo.
    echo ❌ Failed to create database tables
    echo Please check your DATABASE_URL is correct
    exit /b 1
)

echo.
echo ✓ Database tables created
echo.

REM Run seed scripts
echo 🌱 Seeding Design Knowledge Base...
call npm run design:seed

if errorlevel 1 (
    echo ⚠️  Design KB seed had issues (may be normal if data already exists)
) else (
    echo ✓ Design KB seeded successfully
)

echo.
echo ==========================================
echo ✅ Database Setup Complete!
echo ==========================================
echo.
echo Next steps:
echo 1. Start the server: npm run dev
echo 2. Visit: http://localhost:5000/design-kb
echo 3. (Optional) Validate data: npx tsx server/scripts/validate-design-kb-links.ts
echo.


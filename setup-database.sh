#!/bin/bash
# Automated Database Setup Script for Telescope App

set -e  # Exit on error

echo "=========================================="
echo "Telescope Database Setup"
echo "=========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set in .env file"
    echo ""
    echo "Please add your database URL to .env:"
    echo "DATABASE_URL=postgresql://user:pass@host/database"
    echo ""
    echo "Options:"
    echo "1. Create free Neon database: https://neon.tech"
    echo "2. Use local PostgreSQL: postgresql://postgres:postgres@localhost:5432/telescope"
    exit 1
fi

echo "✓ DATABASE_URL found"
echo ""

# Run database push
echo "📊 Creating database tables..."
npm run db:push

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Failed to create database tables"
    echo "Please check your DATABASE_URL is correct"
    exit 1
fi

echo ""
echo "✓ Database tables created"
echo ""

# Run seed scripts
echo "🌱 Seeding Design Knowledge Base..."
npm run design:seed

if [ $? -eq 0 ]; then
    echo "✓ Design KB seeded successfully"
else
    echo "⚠️  Design KB seed had issues (may be normal if data already exists)"
fi

echo ""
echo "=========================================="
echo "✅ Database Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Start the server: npm run dev"
echo "2. Visit: http://localhost:5000/design-kb"
echo "3. (Optional) Validate data: npx tsx server/scripts/validate-design-kb-links.ts"
echo ""


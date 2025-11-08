#!/bin/bash

# AstroDB Setup Script
# This script sets up the astronomical knowledge base

set -e

echo "🌌 Setting up Astronomical Knowledge Base..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL environment variable is not set"
  echo "   Please set it to your PostgreSQL connection string"
  exit 1
fi

# Check if ASTRO_KB_ENABLED is set
if [ "$ASTRO_KB_ENABLED" != "true" ]; then
  echo "⚠️  ASTRO_KB_ENABLED is not set to 'true'"
  echo "   The AstroDB API will not be accessible"
  echo "   Set ASTRO_KB_ENABLED=true to enable"
fi

# Install Node dependencies
echo "📦 Installing Node dependencies..."
npm ci

# Run database migrations
echo "🗄️  Running database migrations..."
npm run db:push

# Seed the database
echo "🌱 Seeding AstroDB with initial data..."
npm run astrodb:seed

echo "✅ AstroDB setup complete!"
echo ""
echo "You can now:"
echo "  1. Start the API server: npm run dev"
echo "  2. Start the worker: cd worker && python main.py"
echo "  3. Use Docker Compose: docker compose -f docker-compose.astrodb.yml up"
echo ""
echo "API will be available at:"
echo "  - Health check: http://localhost:5000/astrodb/v1/health"
echo "  - Equipment: http://localhost:5000/astrodb/v1/equipment/devices"
echo "  - Catalog: http://localhost:5000/astrodb/v1/catalog/objects"
echo "  - Satellites: http://localhost:5000/astrodb/v1/satobs/satellites"
echo "  - Events: http://localhost:5000/astrodb/v1/events"
echo ""
echo "📚 See README-astrodb.md for full documentation"

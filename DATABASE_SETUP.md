# Database Setup Guide

The Design Knowledge Base requires a PostgreSQL database. You have two options:

## Option 1: Neon Cloud Database (Recommended, Free)

**Why?** No installation needed, free tier available, serverless

### Steps:

1. **Create Neon Account**
   - Go to https://neon.tech
   - Sign up (free)
   - Create a new project (name it "telescope" or similar)

2. **Get Connection String**
   - After creating project, copy the connection string
   - It will look like: `postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require`

3. **Update .env**
   - Open `Telescope/.env`
   - Replace the DATABASE_URL line with your connection string:
     ```
     DATABASE_URL=postgresql://your-connection-string-here
     ```

4. **Run Setup**
   ```bash
   cd Telescope
   npm run db:push          # Creates tables
   npm run design:seed      # Populates Design KB
   ```

5. **Verify**
   ```bash
   npm run dev              # Start server
   # Visit: http://localhost:5000/design-kb
   ```

## Option 2: Local PostgreSQL

**Why?** Full control, works offline

### Steps:

1. **Install PostgreSQL**

   **Windows:**
   - Download from: https://www.postgresql.org/download/windows/
   - Run installer (default settings are fine)
   - Remember the password you set for the `postgres` user

   **Alternative - Docker:**
   ```bash
   docker run -d \
     --name telescope-postgres \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=telescope \
     -p 5432:5432 \
     postgres:15
   ```

2. **Create Database** (if not using Docker)
   ```bash
   # Open Command Prompt or PowerShell
   psql -U postgres
   # Enter password when prompted
   CREATE DATABASE telescope;
   \q
   ```

3. **Update .env**
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/telescope
   ```
   (Replace password if you set a different one)

4. **Run Setup**
   ```bash
   cd Telescope
   npm run db:push          # Creates tables
   npm run design:seed      # Populates Design KB
   ```

5. **Verify**
   ```bash
   npm run dev              # Start server
   # Visit: http://localhost:5000/design-kb
   ```

## Automated Setup Scripts

Once DATABASE_URL is configured, run:

**Windows:**
```bash
setup-database.bat
```

**Linux/Mac:**
```bash
./setup-database.sh
```

These scripts will automatically:
- Create all database tables
- Seed the Design Knowledge Base with 40+ concepts, 20+ equations, 12 examples, 50 rules
- Verify the setup

## Troubleshooting

### "password authentication failed"
- Your database credentials are incorrect
- For Neon: Get a fresh connection string from your Neon dashboard
- For local: Check your postgres password

### "No DATABASE_URL found"
- Make sure .env file exists in the Telescope directory
- Check that DATABASE_URL line is not commented out (no # at start)
- Restart your terminal/IDE after changing .env

### "Connection timeout"
- For Neon: Check your internet connection
- For local: Make sure PostgreSQL service is running
  - Windows: Check Services > postgresql-x64-15
  - Docker: `docker ps` should show the container running

### "relation does not exist"
- Tables weren't created
- Run: `npm run db:push` to create tables
- Then: `npm run design:seed` to populate data

## Validation

After setup, validate the data:

```bash
npx tsx server/scripts/validate-design-kb-links.ts
```

Should show:
- ✅ All checks passed! Design KB is in good shape.

## What Gets Created

The setup creates these tables:
- `design_concept` - 40+ telescope design concepts
- `design_equation` - 20+ optical formulas with unit tests
- `design_example` - 12 complete telescope examples
- `design_procedure` - 3 procedures (collimation, safety, testing)
- `design_rule_of_thumb` - 50 design guidelines
- `design_source_ref` - Source citations
- `design_xref` - Cross-references between tables
- Plus: dimensions, figures, part_files tables

## Quick Start Summary

1. Get database URL (Neon or local PostgreSQL)
2. Update `.env`: `DATABASE_URL=your-url-here`
3. Run: `npm run db:push && npm run design:seed`
4. Start: `npm run dev`
5. Visit: http://localhost:5000/design-kb

🎉 Done! The Design Knowledge Base is now functional.

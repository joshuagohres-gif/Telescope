# AstroDB Deployment Guide

## Quick Start

### Using Docker Compose (Recommended)

```bash
# 1. Clone repository
git clone <repository-url>
cd telescope-control

# 2. Set environment variables
cp .env.example .env
# Edit .env and set:
# - DATABASE_URL
# - ASTRO_KB_ENABLED=true

# 3. Start all services
docker compose -f docker-compose.astrodb.yml up -d

# 4. Verify deployment
curl http://localhost:8080/astrodb/v1/health
```

### Manual Deployment

#### Prerequisites
- PostgreSQL 15+
- Node.js 20+
- Python 3.11+

#### Steps

```bash
# 1. Install Node dependencies
npm ci --only=production

# 2. Build application
npm run build

# 3. Run migrations
export DATABASE_URL="postgresql://..."
npm run db:push

# 4. Seed database
npm run astrodb:seed

# 5. Start API server
export ASTRO_KB_ENABLED=true
export PORT=8080
npm start

# 6. Start worker (separate process)
cd worker
pip install -r requirements.txt
python main.py
```

## Environment Variables

### Required
- `DATABASE_URL`: PostgreSQL connection string
- `ASTRO_KB_ENABLED`: Set to `"true"` to enable AstroDB API

### Optional
- `PORT`: API server port (default: 5000)
- `NODE_ENV`: Environment (production/development)
- `REDIS_URL`: Redis connection string (optional, for job queue)

## Monitoring

### Health Checks
```bash
# API health
curl http://localhost:8080/astrodb/v1/health

# Database health
psql $DATABASE_URL -c "SELECT 1"
```

### Import History
```bash
# View import runs
curl http://localhost:8080/astrodb/v1/admin/import-runs
```

## Maintenance

### Update TLEs
```bash
# Manual TLE update
cd worker
python -c "import asyncio; from main import fetch_satellite_tles; asyncio.run(fetch_satellite_tles())"
python importer.py
```

### Backup Database
```bash
pg_dump $DATABASE_URL > backup.sql
```

### Scale Worker
```bash
# Run multiple worker instances
docker compose -f docker-compose.astrodb.yml up -d --scale astrodb-worker=3
```

## Production Recommendations

1. **Use managed PostgreSQL** (AWS RDS, Digital Ocean, Neon, etc.)
2. **Enable connection pooling** (PgBouncer)
3. **Add rate limiting** (nginx, Cloudflare)
4. **Set up monitoring** (Prometheus, Grafana)
5. **Configure backups** (automated daily backups)
6. **Use CDN** for static assets
7. **Enable HTTPS** (Let's Encrypt, Cloudflare)

## Troubleshooting

### API returns 404
- Check `ASTRO_KB_ENABLED=true` is set
- Verify routes are registered: check logs for "Register AstroDB routes"

### Database connection errors
- Verify `DATABASE_URL` is correct
- Check PostgreSQL is running: `pg_isready -d $DATABASE_URL`
- Ensure firewall allows connections

### Worker not fetching data
- Check worker logs: `docker compose logs astrodb-worker`
- Verify network connectivity to data sources
- Check rate limiting isn't blocking requests

### Import failures
- Check NDJSON files in `/data/staging`
- Verify database schema is up to date: `npm run db:push`
- Check import run history for errors

## Security

### Production Checklist
- [ ] Use strong database password
- [ ] Enable SSL for database connections
- [ ] Set up firewall rules
- [ ] Implement rate limiting
- [ ] Add admin route authentication
- [ ] Enable CORS only for trusted origins
- [ ] Keep dependencies updated
- [ ] Monitor logs for suspicious activity

## Support

For issues or questions, see [README-astrodb.md](../README-astrodb.md) or open an issue.

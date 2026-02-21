# VereinsKasse

A production-ready SaaS application for German clubs and associations (Vereine) to manage their finances and members.

## Features

### Free Tier
- Kassenbuch (cash book) with income/expense tracking
- Mitgliederverwaltung (up to 50 members)
- Category management
- Dashboard with statistics

### Premium (0,99€/month)
- Unlimited members
- Mahnwesen (payment reminders with PDF letters)
- Jahresabschluss PDF export
- Email notifications to members
- DATEV CSV export

### Admin
- User management
- Subscription management
- Feedback system
- System statistics

## Quick Start

```bash
cp .env.example .env
# Edit .env with your configuration
docker compose up -d
```

The app will be available at http://localhost

The first registered user automatically becomes admin.

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy 2.0 (async), PostgreSQL 16
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Radix UI, Framer Motion
- **Infrastructure**: Docker Compose, nginx reverse proxy

## Security

- PostgreSQL is NOT exposed to the host (internal network only)
- JWT authentication with httpOnly cookies
- bcrypt password hashing
- Rate limiting via nginx
- DSGVO/GDPR compliant (data export, deletion endpoints)

## Development

```bash
# Backend only
cd backend && pip install -e ".[dev]"
uvicorn app.main:app --reload

# Frontend only
cd frontend && npm install && npm run dev
```

## Environment Variables

See `.env.example` for all required environment variables.

## License

Proprietary - All rights reserved

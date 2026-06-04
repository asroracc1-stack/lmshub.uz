# Railway deployment

This service deploys the Spring Boot backend from `java-backend/` using the root `Dockerfile`.

## Required Railway services

Add a PostgreSQL database to the same Railway project and connect it to this service. The backend expects these Railway PostgreSQL variables:

- `PGHOST`
- `PGPORT`
- `PGDATABASE`
- `PGUSER`
- `PGPASSWORD`

Do not use a plain `postgresql://...` value for `SPRING_DATASOURCE_URL`. If you set `SPRING_DATASOURCE_URL` manually, it must start with `jdbc:postgresql://`.

## Required service variables

Set these in Railway service variables:

```env
JWT_SECRET=replace_with_a_long_random_secret_at_least_32_chars
SPRING_PROFILES_ACTIVE=production
ALLOWED_ORIGINS=https://lmshub.uz,https://www.lmshub.uz,https://*.up.railway.app
```

Optional variables:

```env
GEMINI_API_KEY=
GEMINI_API_KEYS=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

## Healthcheck

Railway should use:

```text
/healthz
```

The app binds to Railway's dynamic `$PORT` from the Docker entrypoint.

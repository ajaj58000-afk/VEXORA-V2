# VEXORA Store

Next.js application. Deploy on Vercel (not GitHub Pages).

## Local development

```bash
npm install
npm run dev
```

## Production

```bash
npm run build
npm run start
```

## Deployment notes

- Import this repository into Vercel and select the Next.js framework preset.
- Configure the environment variables required by the database/authentication setup before deploying.
- Provision a PostgreSQL database and set `DATABASE_URL` to its connection string.
- Never commit real secrets or production credentials.

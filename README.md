# Foodie Meter — Backend API

Backend for the Foodie Meter school project: auth (with email verification), profile, daily calorie intake logging, and a recipe system (user recipes + curated nutritionist recipes).

## Stack
Node.js + Express, PostgreSQL + Prisma ORM, JWT auth, Nodemailer (Gmail App Password, with an automatic disposable-inbox fallback in dev), Swagger/OpenAPI docs.

## Setup

```bash
npm install
cp .env.example .env   # then fill in DATABASE_URL, JWT_SECRET, SMTP_* (see below)
npm run prisma:migrate # creates tables
npm run prisma:seed    # seeds sample nutritionist recipes
npm run dev             # starts the API on http://localhost:4000
```

- API docs (Swagger UI, live and testable): **http://localhost:4000/api/docs**
- Raw OpenAPI JSON: `http://localhost:4000/api/docs.json`
- Health check: `http://localhost:4000/health`

### Email
If `SMTP_USER`/`SMTP_PASS` in `.env` are left as placeholders, the server automatically uses a disposable Ethereal test inbox in development — signup still works, and a preview link for the email is printed in the server console. The plaintext verification code is also logged to the console (`[auth] Verification code for user ...`) so you can test the flow without checking any inbox.

To send real email, generate a [Gmail App Password](https://myaccount.google.com/apppasswords) and set `SMTP_USER`/`SMTP_PASS`/`MAIL_FROM` in `.env`.

## Auth flow (for the frontend)
1. `POST /api/auth/signup` — creates an unverified account, emails a 6-digit code
2. `POST /api/auth/verify-email` — confirm the code, returns a JWT
3. `POST /api/auth/login` — returns a JWT (only works once verified)
4. Send the JWT as `Authorization: Bearer <token>` on every other endpoint

Full request/response shapes for every endpoint are in Swagger UI (`/api/docs`) — click **Authorize** and paste the JWT once, then all protected endpoints become testable in the browser.

## Endpoints
| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/signup`, `verify-email`, `resend-verification`, `login` |
| Profile | `GET/PUT /api/users/me` |
| Calorie intake | `POST/GET /api/calorie-intake`, `GET/PUT /api/calorie-intake/:id` |
| Recipes | `POST/GET /api/recipes`, `GET/DELETE /api/recipes/:id`, `POST /api/recipes/from-nutritionist/:id` |
| Nutritionist recipes | `GET /api/nutritionist-recipes`, `GET /api/nutritionist-recipes/:id` |

## Project structure
```
src/
  config/     env, Prisma client, mailer
  middleware/ auth guard, error handler, validation
  modules/    auth, users, calorieIntake, recipes, nutritionistRecipes
  docs/       Swagger setup
  app.js, server.js
prisma/
  schema.prisma, migrations/, seed.js
```

## Database
Hosted on Supabase Postgres (session pooler, `aws-0-ap-northeast-1.pooler.supabase.com:5432` — required for IPv4 connectivity; the direct `db.<ref>.supabase.co` host is IPv6-only). Migrations and seed data are already applied there — `npm run dev` connects straight to it, no local Postgres needed.

## Next steps (not done yet)
- The **database** is live on Supabase, but the **Express server** itself still isn't deployed anywhere — Supabase only hosts Postgres, not this Node app. Deploy `src/` to a free host (Render, Railway, Fly.io) so your teammate can hit a real URL instead of your localhost. Needs your own account on whichever host you pick — connect this repo (push to GitHub first) and set the same env vars from `.env.example` (with the real Supabase `DATABASE_URL`).
- Point `servers` in `src/docs/swagger.js` at the deployed URL once live, so Swagger UI's "Try it out" hits the right host.

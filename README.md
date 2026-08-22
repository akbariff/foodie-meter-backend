# Foodie Meter — Backend API

Backend for the Foodie Meter school project: auth (with email verification, password reset), roles/tiers, profile, daily calorie goal + meal-level diary logging, and a recipe system (user recipes + curated nutritionist recipes).

This implements Phase 1 ("Must Have") of the team's Backend Alignment document (BC-01 to BC-10). Phase 2 (Nutritionist/Admin CRUD, subscriptions, reports) and Phase 3 (AI/advanced features) are intentionally not implemented yet.

## Stack
Node.js + Express, PostgreSQL (Supabase) + Prisma ORM, JWT auth, Nodemailer (Gmail App Password, with an automatic disposable-inbox fallback in dev), Swagger/OpenAPI docs, Jest + Supertest for integration tests.

## Setup

```bash
npm install
cp .env.example .env   # then fill in DATABASE_URL, JWT_SECRET, SMTP_* (see below)
npm run prisma:migrate # creates/updates tables
npm run prisma:seed    # seeds sample nutritionist recipes
npm run dev             # starts the API on http://localhost:4477
npm test                 # runs the integration test suite
```

- API docs (Swagger UI, live and testable): **http://localhost:4477/api/docs**
- Raw OpenAPI JSON: `http://localhost:4477/api/docs.json`
- Health check: `http://localhost:4477/health`

> Port defaults to `4477` (not the more common `3000`/`4000`) to avoid clashing with other local dev servers. Change `PORT` in `.env` if needed.

### Email
If `SMTP_USER`/`SMTP_PASS` in `.env` are left as placeholders, the server automatically uses a disposable Ethereal test inbox in development — signup still works, and a preview link for the email is printed in the server console. The plaintext code is also logged (`[auth] EMAIL_VERIFY code for user ...` / `[auth] PASSWORD_RESET code for user ...`) so you can test the flow without checking any inbox.

To send real email, generate a [Gmail App Password](https://myaccount.google.com/apppasswords) and set `SMTP_USER`/`SMTP_PASS`/`MAIL_FROM` in `.env`.

## Response contract
Every endpoint returns one consistent envelope:

```json
{ "success": true, "data": { }, "message": "optional" }
```
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "fields": { "email": "A valid email is required" } } }
```

## Auth flow (for the frontend)
1. `POST /api/auth/signup` — creates an unverified account, emails a 6-digit code
2. `POST /api/auth/verify-email` — confirm the code, returns a JWT
3. `POST /api/auth/login` — returns a JWT (blocked if unverified or suspended)
4. Send the JWT as `Authorization: Bearer <token>` on every other endpoint
5. `PUT /api/auth/change-password` / `POST /api/auth/forgot-password` + `POST /api/auth/reset-password` for password management

Every request to a protected route re-checks the user's verified/active status straight from the database (not just the JWT), so a suspended account is blocked immediately without waiting for the token to expire.

Full request/response shapes for every endpoint are in Swagger UI (`/api/docs`) — click **Authorize** and paste the JWT once, then all protected endpoints become testable in the browser.

## Endpoints
| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/signup`, `verify-email`, `resend-verification`, `login`, `PUT change-password`, `POST forgot-password`, `POST reset-password` |
| Profile | `GET/PUT /api/users/me` (includes `role`, `subscriptionTier`, `status`) |
| Calorie goal | `GET/PUT /api/calorie-goal` |
| Calorie intake (diary) | `POST/GET /api/calorie-intake` (supports `?date=YYYY-MM-DD`), `GET /api/calorie-intake/summary?date=`, `GET/PUT/DELETE /api/calorie-intake/:id` |
| Recipes | `POST/GET /api/recipes`, `GET/PUT/DELETE /api/recipes/:id`, `POST /api/recipes/from-nutritionist/:id` |
| Nutritionist recipes | `GET /api/nutritionist-recipes`, `GET /api/nutritionist-recipes/:id` |

Diary entries are meal-level: `consumedAt`, `mealType` (`BREAKFAST`/`LUNCH`/`DINNER`/`SNACK`), `foodName`, `portion` (optional), `calories`, `notes` (optional).

## Roles, tiers, and authorization
`User` now has `role` (`USER`/`NUTRITIONIST`/`ADMIN`, default `USER`), `subscriptionTier` (`FREE`/`PREMIUM`, default `FREE`), and `status` (`ACTIVE`/`SUSPENDED`, default `ACTIVE`). `src/middleware/authorize.js` exports `requireRole(...)`/`requireTier(...)` guards, ready for Phase 2's Nutritionist/Admin/Premium-only endpoints — no Phase 1 route uses them yet since there's nothing role-restricted in this phase.

`/api/auth/*` routes are rate-limited (20 requests / 15 min per IP) against brute-force/abuse.

## Project structure
```
src/
  config/     env, Prisma client, mailer
  middleware/ auth guard (+ role/tier authorize), error handler, validation, rate limit
  utils/      respond.js (success envelope helpers)
  modules/    auth, users, calorieGoal, calorieIntake, recipes, nutritionistRecipes
  docs/       Swagger setup
  app.js, server.js
prisma/
  schema.prisma, migrations/, seed.js
tests/
  journey.test.js — full signup→verify→login→...→reset-password flow, plus authz failure cases
```

## Database
Hosted on Supabase Postgres (session pooler, `aws-0-ap-northeast-1.pooler.supabase.com:5432` — required for IPv4 connectivity; the direct `db.<ref>.supabase.co` host is IPv6-only). Migrations and seed data are already applied there — `npm run dev` connects straight to it, no local Postgres needed.

## Known limitations (by design, for this phase)
- Changing/resetting a password does not revoke already-issued JWTs (no session/token-versioning system yet) — acceptable for the FYP scope, worth flagging if extended.
- No Nutritionist/Admin CRUD, subscriptions, reports, or recommendations yet — Phase 2 per the team's alignment doc.

## Next steps (not done yet)
- The **database** is live on Supabase, but the **Express server** itself still isn't deployed anywhere — Supabase only hosts Postgres, not this Node app. Deploy `src/` to a free host (Render, Railway, Fly.io) so your teammate can hit a real URL instead of your localhost. Needs your own account on whichever host you pick — connect this repo (push to GitHub first) and set the same env vars from `.env.example` (with the real Supabase `DATABASE_URL`).
- Point `servers` in `src/docs/swagger.js` at the deployed URL once live, so Swagger UI's "Try it out" hits the right host.

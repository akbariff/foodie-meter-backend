# Foodie Meter — Backend API

Backend for the Foodie Meter school project: auth (email verification, password reset), roles/tiers, profile, daily calorie goal + meal-level diary logging, a recipe system (user recipes + curated Nutritionist recipes), user Reviews, a Nutritionist application/approval workflow, and an Admin surface (user management, review moderation, site content, analytics).

Implements Phase 1 (BC-01–BC-10) and Phase 2's concrete CRUD/role work (Reviews, Nutritionist content + moderation, Admin) from the team's Backend Alignment document. **Not implemented**: subscription/payment processing, AI-personalized recommendations, gamification/social, predictive analytics, and image-recognition meal logging — these need product decisions (payment gateway, AI approach) beyond what a backend amendment alone can settle.

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
>
> **Database note:** the Supabase project used for this app auto-pauses after inactivity (free tier). If `prisma migrate`/the app can't connect, check the Supabase dashboard for a "paused" banner and resume it, or develop against local Postgres in the meantime (`DATABASE_URL="postgresql://<you>@localhost:5432/foodie_meter?schema=public"`, `npx prisma migrate dev`).

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

Every request to a protected route re-checks the user's verified/active status **and current role/tier** straight from the database on every request (not just the JWT) — so a suspension, or a Nutritionist promotion, takes effect immediately on the same token, without re-login.

Full request/response shapes for every endpoint are in Swagger UI (`/api/docs`) — click **Authorize** and paste the JWT once, then all protected endpoints become testable in the browser.

## Endpoints
| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/signup`, `verify-email`, `resend-verification`, `login`, `PUT change-password`, `POST forgot-password`, `POST reset-password` |
| Profile | `GET/PUT /api/users/me` (includes `role`, `subscriptionTier`, `status`, `assignedCategory`) |
| Calorie goal | `GET/PUT /api/calorie-goal` |
| Calorie intake (diary) | `POST/GET /api/calorie-intake` (supports `?date=YYYY-MM-DD`), `GET /api/calorie-intake/summary?date=`, `GET/PUT/DELETE /api/calorie-intake/:id` |
| Recipes | `POST/GET /api/recipes`, `GET/PUT/DELETE /api/recipes/:id`, `POST /api/recipes/from-nutritionist/:id` |
| Recipe moderation | `GET /api/recipes/flagged`, `PATCH /api/recipes/:id/flag`, `PATCH /api/recipes/:id/unflag` — Nutritionist/Admin, cross-user |
| Nutritionist recipes | `GET /api/nutritionist-recipes` (supports `?category=`), `GET /:id`, `POST/PUT/DELETE` — Nutritionist (own + assigned category) / Admin (any) |
| Nutritionist applications | `POST /api/nutritionist-applications`, `GET /mine` — any USER can apply |
| Reviews | `POST /api/reviews`, `GET /api/reviews` (public, published only, paginated), `GET /mine`, `PUT/DELETE /:id` |
| Site content | `GET /api/site-content` (public key/value map), `PUT /api/site-content/:key` (Admin) |
| Admin — users | `GET /api/admin/users` (filter by role/tier/status), `GET /:id`, `PATCH /:id/status`, `PATCH /:id/role` |
| Admin — applications | `GET /api/admin/nutritionist-applications`, `PATCH /:id` (approve promotes the user + sets `assignedCategory`) |
| Admin — reviews | `GET /api/admin/reviews`, `PATCH /:id/status` (moderate) |
| Admin — analytics | `GET /api/admin/analytics/summary` — user/recipe/diary/review counts, 30-day signups |

Diary entries are meal-level: `consumedAt`, `mealType` (`BREAKFAST`/`LUNCH`/`DINNER`/`SNACK`), `foodName`, `portion` (optional), `calories`, `notes` (optional).

## Roles, tiers, and authorization
`User` has `role` (`USER`/`NUTRITIONIST`/`ADMIN`, default `USER`), `subscriptionTier` (`FREE`/`PREMIUM`, default `FREE`), `status` (`ACTIVE`/`SUSPENDED`, default `ACTIVE`), and `assignedCategory` (Nutritionist only — the content category they may publish into). `src/middleware/authorize.js` exports `requireRole(...)`/`requireTier(...)` guards, applied **per route**, not blanket per-router, wherever a router mixes public/owner/moderator access (e.g. `/api/reviews`, `/api/recipes`, `/api/nutritionist-recipes`).

There's no self-service path to NUTRITIONIST or ADMIN — a `USER` applies via `POST /api/nutritionist-applications`, and an Admin approves it (`PATCH /api/admin/nutritionist-applications/:id`), which promotes the role and sets `assignedCategory` in one transaction. The first ADMIN account has to be created directly in the database (there's no bootstrap endpoint, deliberately).

`/api/auth/*` routes are rate-limited (20 requests / 15 min per IP) against brute-force/abuse.

## Project structure
```
src/
  config/     env, Prisma client, mailer
  middleware/ auth guard (+ role/tier authorize), error handler, validation, rate limit
  utils/      respond.js (success envelope helpers)
  modules/    auth, users, calorieGoal, calorieIntake, recipes, nutritionistRecipes,
              reviews, nutritionistApplications, siteContent, admin/
  docs/       Swagger setup
  app.js, server.js
prisma/
  schema.prisma, migrations/, seed.js
tests/
  journey.test.js — Phase 1 flow: signup→verify→login→...→reset-password, plus authz failure cases
  phase2.test.js   — Reviews, Nutritionist application→approval pipeline, curated-recipe category
                     scoping, cross-user recipe flagging, Admin user/review/analytics endpoints,
                     and the self-suspend/self-role-change guards
```

## Database
Hosted on Supabase Postgres (session pooler, `aws-0-ap-northeast-1.pooler.supabase.com:5432` — required for IPv4 connectivity; the direct `db.<ref>.supabase.co` host is IPv6-only). See the database-note above if it's paused. A standalone schema reference (ERD + field tables) is in `docs/DATABASE_SCHEMA.docx`.

## Known limitations (by design)
- Changing/resetting a password does not revoke already-issued JWTs (no session/token-versioning system) — acceptable for FYP scope, worth flagging if extended.
- Admin analytics reports signups-by-day from real timestamps, but explicitly does **not** report retention or subscription-conversion metrics — that needs usage/event logging that doesn't exist yet, and fabricating numbers for it would be worse than omitting them.
- No subscription/payment processing, AI recommendations, gamification, predictive analytics, or image-recognition logging — all deferred, need product/technical decisions beyond a backend-only amendment.

## Next steps (not done yet)
- The **database** is on Supabase, but the **Express server** itself still isn't deployed anywhere. Deploy `src/` to a free host (Render, Railway, Fly.io) — connect this repo and set the same env vars from `.env.example` (with the real Supabase `DATABASE_URL`).
- Point `servers` in `src/docs/swagger.js` at the deployed URL once live.
- Swap in the real product PRD — the file that arrived as `FYP-26-S3-35P_PRD.docx` turned out to be a different team's project (WiseWorkout App) and was not used for this amendment.

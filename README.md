# Foodie Meter — Backend API

Backend for the Foodie Meter school project: auth, roles/tiers, profile, daily calorie goal and diary, recipes, and nutritionist-reviewed AI meal recommendations.

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
| AI meal review | `POST/GET /api/ai-meals/jobs`, `GET /api/ai-meals/jobs/:id`, `GET /api/ai-meals`, `PATCH /api/ai-meals/:id`, `POST /api/ai-meals/:id/approve` and `/reject` (Nutritionist/Admin) |
| Premium recommendations | `GET /api/recommendations?mealType=LUNCH&date=YYYY-MM-DD` |

Diary entries are meal-level: `consumedAt`, `mealType` (`BREAKFAST`/`LUNCH`/`DINNER`/`SNACK`), `foodName`, `portion` (optional), `calories`, `notes` (optional).

## Roles, tiers, and authorization
`User` has `role` (`USER`/`NUTRITIONIST`/`ADMIN`), `subscriptionTier` (`FREE`/`PREMIUM`), and `status` (`ACTIVE`/`SUSPENDED`). The AI review endpoints require the Nutritionist or Admin role; recommendations require Premium. These checks run on the server.

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
The API needs a PostgreSQL connection string in your local `.env`. It can use Supabase or local PostgreSQL. Apply the new AI migration with `npm run prisma:migrate` before starting the updated backend.

## Known limitations
- Changing/resetting a password does not revoke already-issued JWTs (no session/token-versioning system yet) — acceptable for the FYP scope, worth flagging if extended.
- Subscription billing, reports, medical-diet recommendations, and most Nutritionist/Admin CRUD remain outside this phase.

## AI meal recommendation demo

The AI meal feature uses a local Ollama model to draft meal candidates. A verified nutritionist account must check ingredients, tags, serving size, calories, macros, and the nutrition source before approving a candidate. Only approved meals appear in Premium recommendations. The model does not determine trusted nutrition values. This feature is for general wellness, not medical diets or allergy-safety guarantees.

1. Install [Ollama for Windows](https://docs.ollama.com/windows), then run `ollama pull gemma3:4b`. Keep Ollama running on the same PC as the Express API. The API uses `http://127.0.0.1:11434` by default; adjust `OLLAMA_URL` and `OLLAMA_MODEL` in `.env` only if needed.
2. Configure `DATABASE_URL` and `JWT_SECRET` in `.env`, then run `npm install`, `npm run prisma:migrate`, and `npm run dev`. This migration adds AI meals, generation jobs, and dietary profile fields. Generation jobs interrupted by an API restart are marked failed and can be started again.
3. For a local demo without email delivery, set unique `DEMO_PREMIUM_PASSWORD` and `DEMO_NUTRITIONIST_PASSWORD` values (at least 12 characters) in `.env`, then run `npm run demo:users`. This creates verified `premium@foodiemeter.local` and `nutritionist@foodiemeter.local` accounts. Existing accounts are left unchanged. Alternatively, register and verify accounts normally, then assign access with `npm run demo:access -- nutritionist@example.com nutritionist` and `npm run demo:access -- premium@example.com premium`. Both commands refuse to run with `NODE_ENV=production`.
4. Log in as the nutritionist in Expo. Open **Profile → Review AI meals**, generate candidates, then verify and approve one. Log in as the Premium user, set a calorie goal and dietary preference, then open **Premium → AI meal recommendations**. Free accounts receive 403 from `/api/recommendations`.

Generation is asynchronous: the nutritionist screen polls a persisted job. If Ollama is offline or returns invalid output, the job becomes `FAILED` and shows the reason. Recommendation requests do not call Ollama. Swagger documents the review and recommendation endpoints at `/api/docs`.

The current Expo app still has mock-only areas outside auth, goals, diary, profile, and AI meal recommendations. Premium access is assigned to test accounts; there is no payment flow.

## Next steps (not done yet)
- The **database** is live on Supabase, but the **Express server** itself still isn't deployed anywhere — Supabase only hosts Postgres, not this Node app. Deploy `src/` to a free host (Render, Railway, Fly.io) so your teammate can hit a real URL instead of your localhost. Needs your own account on whichever host you pick — connect this repo (push to GitHub first) and set the same env vars from `.env.example` (with the real Supabase `DATABASE_URL`).
- Point `servers` in `src/docs/swagger.js` at the deployed URL once live, so Swagger UI's "Try it out" hits the right host.

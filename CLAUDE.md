# Foodie Meter Backend — CLAUDE.md

## What this is
Backend-only repo for a school FYP (CSIT321, group FYP-26-S3-35P): a mobile dietary/nutrition app. **There is no frontend in this repo** — a teammate consumes this API from a separate mobile app project. Node.js + Express + Prisma ORM + PostgreSQL (Supabase), JWT auth. This repo does not follow the org-wide default stack (React/Vite/Tailwind/Redux) — it's plain Node/Express, no TypeScript, no React.

## Current phase and what it excludes
**Phase 1 + Phase 2 (concrete CRUD/role work) are done.** Not implemented, and out of scope until explicitly picked up:
- Subscription/payment processing (needs a payment-gateway decision)
- AI-personalized recommendations (needs a model/approach decision)
- Gamification/social features (streaks, badges, leaderboards)
- Predictive analytics
- Image-recognition meal logging
- Real usage/event-tracking (Admin analytics only reports what's derivable from existing timestamps — no retention or conversion metrics, and don't fabricate them)

These were all identified from the URS/PRD/TDM/PTD documents but deliberately deferred — each needs a product or technical decision beyond what a backend amendment alone can settle.

## Source of truth
- **Database schema**: `prisma/schema.prisma` is authoritative. A standalone rendered reference (ERD + field tables) lives at `docs/DATABASE_SCHEMA.docx` — regenerate it after schema changes, don't hand-edit it out of sync.
- **API contract**: Swagger UI at `/api/docs`, generated from JSDoc comments in `src/modules/**/*.routes.js`. Every new/changed route needs its `@openapi` block updated in the same change.
- **Requirements**: `/Users/mac/Downloads/FYP-26-S3-35P_{URS,TDM,PTD}` — note the file named `FYP-26-S3-35P_PRD.docx` is **wrong** (it's a different team's "WiseWorkout App" project); use PTD for what the PRD would have covered until the real PRD is found.

## Real tech stack (differs from the org default)
Node.js + Express (CommonJS, not TypeScript) + Prisma 7 + PostgreSQL, JWT auth (bcryptjs), Nodemailer, express-validator, Jest + Supertest. Dev server: `npm run dev` (nodemon) on port **4477** (not 3000/4000 — was colliding with an unrelated project on this Mac). Always launch via `.claude/launch.json` (`foodie-meter-dev`) + `preview_start`, never raw `node`/`npm run dev &` through Bash.

## Specific traps
- **Supabase auto-pauses.** Free tier pauses after inactivity; `prisma migrate`/the app fail with `(ENOTFOUND) tenant/user ... not found` when paused. That error means "go resume it in the Supabase dashboard," not "the code is broken." Local Postgres (`foodie_meter` db) is the fallback for development when it's paused — see README.
- **`requireAuth` builds `req.user` from a fresh DB lookup on every request** (`src/middleware/requireAuth.js`), not from JWT claims — this is deliberate (suspension/role changes take effect immediately on an already-issued token). **Whenever a field is added to `User`, it must be added to `req.user` here too**, or every controller that reads it silently sees `undefined`. This exact bug shipped once already (`assignedCategory` was added to the schema but not to `req.user`, causing every Nutritionist-authored-recipe request to 403) — caught by the Phase 2 test suite, not by inspection.
- **Authorization is gated per-route, not per-router**, wherever a router mixes public/owner/moderator access (`reviews`, `recipes`, `nutritionist-recipes`, `site-content`). Don't collapse these into a blanket `router.use(requireRole(...))` — that conflates who can read with who can write.
- **No self-service path to NUTRITIONIST/ADMIN.** A `USER` applies via `POST /api/nutritionist-applications`; an Admin approves it. The first ADMIN account must be created directly in the database — there's no bootstrap endpoint, deliberately.
- **Git**: `main` is the default branch; branch before committing (this repo's convention going forward is `feature/<name>`). Commit and push only when asked.

## Testing
`npm test` runs Jest + Supertest against the app in-process (no port binding needed). `tests/journey.test.js` covers the Phase 1 flow end to end; `tests/phase2.test.js` covers Reviews, the Nutritionist application→approval pipeline, category-scoped curated-recipe CRUD, cross-user recipe flagging, and the Admin surface — including negative/cross-role cases (non-owner edit attempts, non-admin hitting admin routes, self-suspend/self-role-change guards). Extend the relevant file rather than starting a new one per feature; a UAT-style pass (per the global playbook) always includes a "log in as user A, try to touch user B's / an admin's resource" case for every new resource.

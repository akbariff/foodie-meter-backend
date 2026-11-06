# FoodieMeter Landing Page

Responsive static prototype for the FoodieMeter FYP landing page.

## Included

- Landing page with FoodieMeter hero section
- Feature overview based on the URS
- Free vs Premium plan preview
- Clearly labelled demo reviews from Singapore and Malaysia
- Registration page and two-step prototype email verification flow
- Responsive/mobile navigation
- Vercel configuration for clean URLs and basic headers

## Run locally

From this folder:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Registration prototype

The registration form intentionally stores nothing. It only simulates the required flow.
Use verification code `123456` for the demo.

## Backend integration later

The URS confirms a Node.js + Express REST API, PostgreSQL, Prisma ORM, JWT authentication and email verification. When the database/backend design is ready, replace the prototype submit handlers in `script.js` with API calls, for example:

- `POST /api/auth/register`
- `POST /api/auth/verify-email`
- `POST /api/auth/login`

Do not store passwords in the browser. Password hashing and account creation must be handled by the backend.

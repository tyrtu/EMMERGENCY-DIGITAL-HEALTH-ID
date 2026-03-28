# Emergency Health ID

This repository contains the Emergency Health ID project: a web application that provides digital health identity cards, QR-based access to a patient health summary, and a lightweight backend for managing patient and medic profiles. This README documents everything needed to run, test, and maintain the project locally and in typical hosting environments.

**Contents**
- Project overview
- Prerequisites
- Repository layout
- Environment variables
- Local setup and run (backend and frontend)
- Development helpers (ngrok, scripts)
- Authentication and Supabase notes
- Database notes (MongoDB) and sample operations
- Testing
- Troubleshooting
- Deployment guidance
- Contributing and security

## Project overview

The system consists of two main parts:

- `backend/` — Node.js + Express API, MongoDB models, Supabase-based authentication integration, PDF/QR generation services, and middleware for role-based access.
- `frontend/` — React (Vite) single-page application that uses Supabase for auth and the backend API for profile and record management.

The typical flow:

1. A user signs in with Supabase on the frontend (email/password or magic link).
2. The frontend sends authenticated API requests to the backend including a Supabase access token and the Supabase user id (x-auth-id) header.
3. The backend verifies the Supabase token and then maps the Supabase user id (`authId`) to a local `Profile` and a `Patient` or `Medic` record. These local documents hold the application data (basic info, emergency contacts, medical records).

## Prerequisites

- Node.js (v18+ recommended)
- npm
- MongoDB access (Atlas URI or local MongoDB)
- A Supabase project (for authentication)
- Optional: `ngrok` for exposing local server to external devices

On Windows, PowerShell is used in examples below. For other shells, adapt commands accordingly.

## Repository layout

- `backend/` — Express app and models
  - `src/` — routes, controllers, middleware, models, services
  - `app.js` — Express app entry (exported for tests)
  - `package.json` — backend dependencies and scripts
- `frontend/` — React + Vite SPA
  - `src/` — React components, pages, store, utils
  - `package.json` — frontend dependencies and scripts
- `start-single-ngrok.ps1` — PowerShell script to start backend, frontend, and one ngrok tunnel (frontend)
- `Emergency_Health_ID_Presentation.pptx` — generated presentation artifact

## Environment variables

Create a `.env` file inside `backend/` (copy `.env.example` if present) with values for:

- `NODE_ENV` — `development` or `production`
- `PORT` — backend port (default 5000)
- `MONGO_URI` — MongoDB connection string (Atlas or local URI)
- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_ANON_KEY` — Supabase anon/public key used by backend to verify tokens
- `SUPABASE_JWT_SECRET` — Supabase JWT secret (if used by your Supabase project)
- `FRONTEND_URL` — comma-separated allowed origins (e.g. `http://localhost:5173`)

Example `.env` snippet:

```dotenv
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/Digital_Health_Id_db
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret
FRONTEND_URL=http://localhost:5173
```

Important: Do not commit `.env` or any credentials to version control.

## Local setup

1. Clone the repository and change to the project directory.

2. Install dependencies for backend and frontend.

PowerShell sample:

```powershell
cd C:\path\to\EMERGENCY-HEALTH-ID
cd backend
npm install
cd ..\frontend
npm install
```

### Backend: running

Start the backend server (development):

```powershell
cd backend
# ensure .env is configured
npm run dev
```

This runs the Express dev server (nodemon or equivalent) on the port from `.env` (default 5000).

### Frontend: running

Start the Vite dev server:

```powershell
cd frontend
npm run dev
```

The frontend runs on port 5173 by default and proxies `/api` and `/uploads` to the backend in development.

## Using the ngrok helper script

There is a convenience PowerShell script `start-single-ngrok.ps1` that starts the backend and frontend and opens an ngrok tunnel to the frontend.

Run from the repository root (PowerShell):

```powershell
cd C:\path\to\EMERGENCY-HEALTH-ID
.\start-single-ngrok.ps1
```

Notes:
- If you encounter an execution policy error, run with the bypass flag:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-single-ngrok.ps1
```

- If ngrok opens and then closes immediately, run `ngrok` manually to inspect logs:

```powershell
ngrok http 5173 --log=stdout
```

Common causes of immediate ngrok exit: missing ngrok auth token configuration, port already in use, or a broken ngrok installation.

To configure ngrok auth token:

```powershell
ngrok config add-authtoken <your-authtoken>
```

## Authentication and Supabase

Authentication is handled by Supabase. The frontend obtains a Supabase session and sends requests with:

- `Authorization: Bearer <access_token>`
- `x-auth-id: <supabase-user-id>` (the Supabase user UUID)

The backend middleware does two things:

1. `verifyToken` — verifies the Supabase token (if present) and attaches `req.user` when valid.
2. `identifyUser` — uses the `x-auth-id` (or `req.body.authId`/`req.query.authId`) to find a `Profile` document in MongoDB and sets `req.userType` to `patient`, `medic`, or `unknown`.

If you add a user directly in the Supabase console, ensure they can sign in (password set or magic link). When a user signs in through the frontend, the app will send the token and `x-auth-id`, and the backend will identify the user only if a corresponding `Profile` exists in MongoDB.

If you encounter `Unauthorized: user not identified`, inspect the following:

- Does the request include `Authorization` and/or `x-auth-id` headers? (Browser DevTools -> Network)
- Does a `Profile` document exist in MongoDB with `authId` equal to the Supabase user id? If not, create or allow the app to create it via `POST /api/profiles` (requires a valid token).

## Database (MongoDB) notes

- The backend uses Mongoose models: `Profile`, `Patient`, `Medic`, etc.
- `Profile` documents contain `authId` (Supabase UID), `email`, `fullName`, and `role` (`patient`|`medic`|`admin`).
- `Patient` documents must contain at minimum `authId`, `email`, and `basicInfo.fullName` to be useful.

If you need to create a minimal profile for a Supabase user without the frontend, use `mongosh` or a MongoDB client.

Example (PowerShell + mongosh):

```powershell
mongosh "<MONGO_URI>" --eval "db.profiles.updateOne({ authId: 'SUPABASE-UID' }, { $setOnInsert: { authId: 'SUPABASE-UID', email: 'user@example.com', role: 'patient', createdAt: new Date() } }, { upsert: true })"

# Insert a minimal patient if missing
mongosh "<MONGO_URI>" --eval "db.patients.updateOne({ authId: 'SUPABASE-UID' }, { $setOnInsert: { authId: 'SUPABASE-UID', email: 'user@example.com', basicInfo: { fullName: 'User Name' }, createdAt: new Date() } }, { upsert: true })"
```

Avoid direct duplicate inserts for the same `authId`; the database enforces uniqueness on `authId`.

## Testing

Backend tests use Node built-in test runner and `supertest`. Run tests from the `backend/` folder:

```powershell
cd backend
npm test
```

If `sharp` or other native modules cause test startup issues on your environment, consider installing optional native dependencies or running tests that avoid routes that lazy-load those modules.

## Troubleshooting

- Unauthorized / user not identified:
  - Confirm Supabase sign-in works and that the browser sends `Authorization` and `x-auth-id` headers.
  - Create or update the `Profile` and `Patient` documents in MongoDB for the Supabase UID.

- ngrok exits immediately:
  - Run `ngrok http 5173 --log=stdout` to capture error messages.
  - Ensure `ngrok` is configured with an auth token: `ngrok config add-authtoken <token>`.

- Backend fails to start:
  - Confirm `MONGO_URI` and Supabase variables are set in `backend/.env`.
  - Check error output for missing modules or environment variables.

## Deployment notes

This project can be deployed across typical Node and static-host platforms. High-level suggestions:

- Backend: host on a Node server (Heroku, Render, Railway, DigitalOcean App Platform), set environment variables in the host, ensure MongoDB access (Atlas or provider), and set appropriate CORS origins.
- Frontend: build with `npm run build` and host on Vercel, Netlify, or any static host. Point `VITE_API_BASE_URL` / `FRONTEND_URL` to production backend.
- Supabase: used only for authentication here — configure your project's redirect URLs and email settings.

When deploying, do not commit secrets. Use the platform's env var management.

## Security and best practices

- Do not commit `.env` or credentials to version control.
- Use least-privileged API keys and tokens.
- Protect admin routes with robust role checks.
- Use HTTPS in production.

## Contributing

If you plan to contribute:

1. Fork the repo and create a feature branch.
2. Make changes and add tests when appropriate.
3. Run `npm test` in `backend/` to ensure backend tests pass.
4. Open a pull request describing the change.

If you need help with environment configuration, tests, or CI, open an issue or reach out in the repository.

## Contact and further help

If you need me to perform any of the following, say which and I will help:

- Create a minimal `Profile` and `Patient` for a given Supabase UID in the database.
- Add CI (GitHub Actions) to run backend tests automatically.
- Restore or regenerate documentation removed earlier.

This README aims to be a single reference for developers and operators running the project locally and preparing it for production. If you want any section expanded (example API requests, schema references, or development workflows), tell me which section to expand and I will update the file.

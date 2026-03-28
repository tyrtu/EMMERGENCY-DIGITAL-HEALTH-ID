# Vercel Option B Deployment Guide

This guide deploys both frontend and backend on Vercel as two separate projects.

## 1. Backend Vercel Project

### 1.1 In Vercel Dashboard
1. Click `Add New...` -> `Project`.
2. Select repository: `EMMERGENCY-DIGITAL-HEALTH-ID`.
3. Set `Root Directory` to `backend`.
4. Framework preset can stay as `Other`.
5. Deploy once after setting environment variables below.

### 1.2 Backend Environment Variables
Set these in Vercel -> Backend Project -> Settings -> Environment Variables:

- `NODE_ENV` = `production`
- `MONGO_URI` = your MongoDB Atlas URI
- `SUPABASE_URL` = your Supabase project URL
- `SUPABASE_ANON_KEY` = your Supabase anon key
- `FRONTEND_URL` = your frontend Vercel domain (or comma-separated list)

Example `FRONTEND_URL` value:

`https://your-frontend.vercel.app,https://your-frontend-git-main-username.vercel.app`

### 1.3 Backend Notes
- Serverless entry: `backend/api/index.js`
- Vercel config: `backend/vercel.json`
- Runtime blocks fixed:
  - No `app.listen()` on Vercel runtime.
  - Mongo connection reuses active connection.
  - Linux-safe route import casing.

## 2. Frontend Vercel Project

### 2.1 In Vercel Dashboard
1. Click `Add New...` -> `Project`.
2. Select repository: `EMMERGENCY-DIGITAL-HEALTH-ID`.
3. Set `Root Directory` to `frontend`.
4. Framework preset should auto-detect `Vite`.

### 2.2 Frontend Environment Variables
Set these in Vercel -> Frontend Project -> Settings -> Environment Variables:

- `VITE_API_BASE_URL` = backend Vercel domain (no trailing slash)
- `VITE_SUPABASE_URL` = your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` = your Supabase anon key

Example `VITE_API_BASE_URL`:

`https://your-backend.vercel.app`

## 3. Connect Frontend and Backend

After both are deployed:
1. Copy frontend production URL.
2. Add/update backend `FRONTEND_URL` with this URL.
3. Redeploy backend.
4. Verify login and data calls.

## 4. Post-Deploy Verification Checklist

Run these checks:
1. Backend health endpoint opens:
   - `https://your-backend.vercel.app/`
2. Frontend loads:
   - `https://your-frontend.vercel.app`
3. Login works.
4. Dashboard data loads.
5. QR endpoints respond.
6. PDF generation responds.

## 5. Known Limitation for This Codebase

Profile photo uploads currently use local disk storage (`uploads/`).
On Vercel serverless, filesystem is ephemeral and not durable across invocations.

Recommended fix for production durability:
1. Move profile photo storage to cloud storage (Cloudinary, S3, Supabase Storage, or Vercel Blob).
2. Save permanent public URL in `basicInfo.profilePhoto`.

Everything else in Option B is now prepared in code and ready to deploy.

## 6. Optional CLI Deployment Flow

If you want to deploy through CLI:

### Backend
```bash
cd backend
npx vercel
```

### Frontend
```bash
cd frontend
npx vercel
```

Use `npx vercel --prod` after confirming preview works.

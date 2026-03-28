# Emergency Health ID - Full Technical Documentation

## 1. Project Overview

Emergency Health ID is a full-stack medical identity platform with:
- A backend API (Node.js + Express + MongoDB + Supabase token verification)
- A frontend SPA (React + Vite + Redux + Supabase auth)
- QR-based emergency data sharing
- Patient and medic role flows
- Analytics capture and dashboard endpoints
- PDF generation for Health ID card and academic docs

Primary objective:
- Let patients maintain emergency-relevant health records.
- Let medics quickly access emergency-critical data by scanning QR.
- Track scan events and operational metrics.

## 2. Repository Top-Level Contents

- package.json
  - Root dependency: pptxgenjs (used by tools/generate_pptx.js)
- README.md
  - Operational setup and troubleshooting notes
- start-ngrok.ps1
  - Starts backend/frontend and one ngrok tunnel for frontend (uses Vite proxy for API)
- start-ngrok.sh
  - Starts backend/frontend and separate ngrok tunnels (backend + frontend)
- start-single-ngrok.ps1
  - Single-tunnel launcher with dependency checks and cleanup handling
- updated_patient_document.json
  - Data artifact/sample payload
- backend/
  - API server and data layer
- frontend/
  - React client application
- tools/generate_pptx.js
  - Presentation generation utility

## 3. High-Level Architecture

### Backend
- Runtime: Express 5
- Database: MongoDB via Mongoose
- Auth verification: Supabase token check
- Access control: identifyUser + requireRole middleware
- Main responsibilities:
  - Profile and role lookup
  - Patient record CRUD
  - Emergency contact and medical record APIs
  - QR + PDF generation
  - Medication administration logging
  - Analytics ingestion and reporting

### Frontend
- Runtime: React 19 + Vite
- State: Redux Toolkit (auth + mobile slices)
- Auth client: Supabase JS
- API layer: custom apiClient that injects token + x-auth-id
- Main responsibilities:
  - Authentication and session restoration
  - Role-based dashboard routing
  - Patient self-service dashboard
  - Medic scanning and emergency workflow
  - Visualization of analytics and patient insights

## 4. Runtime Request Flow (Backend)

Backend entrypoint: backend/app.js

Request lifecycle:
1. Load env and initialize app.
2. Configure CORS (allowed FRONTEND_URL origins + ngrok domains).
3. Parse JSON/urlencoded payloads and sanitize request body.
4. Serve static files from /uploads.
5. Apply global apiLimiter.
6. Public route groups:
   - /api/qr (with qrLimiter)
   - /api/analytics (with analyticsLimiter)
   - /api/emergency-contacts
7. Protected route groups:
   - verifyToken (token check, tolerant of missing/invalid token)
   - identifyUser (resolve profile role by x-auth-id/authId)
   - /api/profiles, /api/patients, /api/medics, /api/records, /api/medication-log
8. Health endpoint: GET /
9. notFoundHandler + errorHandler

DB connection behavior:
- connectDB() is called unless NODE_ENV === test.

## 5. Backend Folder Deep Dive

### 5.1 backend/src/config

- db.js
  - connectDB() connects to process.env.MONGO_URI and exits process on failure.

### 5.2 backend/src/middleware

- auth.js
  - verifyToken:
    - Reads Authorization: Bearer token.
    - Verifies with Supabase auth.getUser(token).
    - Sets req.user on success, null on failure/no token.
    - Does not hard-fail unauthorized by itself.

- identifyUser.js
  - Reads auth identity from x-auth-id header, req.body.authId, or req.query.authId.
  - Loads Profile by authId.
  - Sets req.userType (patient/medic/unknown), req.profile, req.userRecord.

- requireRole.js
  - Factory middleware requireRole("role") or requireRole(["role1", "role2"]).
  - Returns 401 if unidentified, 403 if insufficient permissions.

- rateLimiter.js
  - apiLimiter: 100 req / 15 min
  - authLimiter: 5 req / 15 min
  - qrLimiter: 10 req / 1 min
  - analyticsLimiter: 30 req / 1 min

- validation.js
  - sanitizeBody recursively trims strings and strips angle brackets.
  - validatePatient rules.
  - validateHealthVitals rules for BP/HR/weight/height/BMI.
  - ID validators for authId and Mongo ObjectId.

- upload.js
  - Multer upload middleware for patient photo endpoint.

- auditLogger.js
  - logAction(req, action, resourceId) helper for audit entries.

- errorHandler.js
  - notFoundHandler for unmatched routes.
  - errorHandler for normalized error responses.

### 5.3 backend/src/models

- Profile.js
  - authId (unique), email (unique), fullName, role (patient/medic/admin), timestamps.

- Patient.js
  - Core patient schema:
    - Account: authId(unique), healthId(unique), email, verification flags.
    - basicInfo: name, dob, age, gender, height, bloodGroup, nationalId, contact, address, profilePhoto.
    - emergencyInfo: contacts, allergies, critical conditions, meds, surgeries, critical notes, doctor/hospital.
    - medicalInfo: immunizations, conditions, medications, surgeries, family history, insurance, lifestyle, healthVitals.
    - qrMetadata: qrCodeId(unique sparse), issuedAt, recordUrl, displayFieldsForQr.
    - status/consent and audit metadata.
  - Virtual age derived from dob.
  - Multiple indexes for frequent lookup fields.

- Medic.js
  - authId (unique sparse), name, specialization, email(unique), phone, licenseNumber(unique), verified.

- MedicalRecord.js
  - patient(ObjectId->Patient), medic(ObjectId->Medic), diagnosis, department, visitDate, status, prescriptions, notes, followUpDate.

- EmergencyContact.js
  - patient(ObjectId->Patient), name, relationship, phone, email, address.

- Analytic.js
  - Multiple analytics schemas/models, including:
    - ScanAnalytics
    - PracticeAnalytics
    - MonthlyAnalytics
    - AlertAnalytics
    - SystemAnalytics
    - PatientActivity
    - MedicPerformance
    - RealTimeAnalytics
    - PredictiveAnalytics

- AuditLog.js
  - userId, action, method, endpoint, statusCode, ipAddress, timestamp.

- Document.js
  - patient ref + file metadata (CommonJS module style).

- Notifications.js
  - user ref + message/read/createdAt.

### 5.4 backend/src/routes

#### Mounted in backend/app.js

1) qrRoutes.js (base: /api/qr)
- GET /card-pdf/:authId
  - Generates printable Health ID PDF.
  - Requires matching token user id and x-auth-id.
- GET /:authId
  - Generates PNG QR code.
- GET /data/:authId
  - Returns frontend display data used in QR section.

2) profileRoutes.js (base: /api/profiles)
- POST /
  - Create profile (default role patient), verifyToken applied.
- GET /:authId
  - Fetch profile by authId with access checks.
- GET /
  - List all profiles.
- PATCH /:authId
  - Update profile by authId.

3) patientRoutes.js (base: /api/patients)
- GET /
  - List all patients (medic/admin).
- POST /
  - Create patient (patient/medic/admin), healthId generation support.
- GET /:identifier
  - Fetch by healthId (EMH-*) or authId.
- POST /:authId/photo
  - Upload/update patient profile photo.
- PUT /:authId/basic-info
  - Update patient personal/basic info.
- PUT /:authId
  - Update patient record (role-constrained behavior).
- PUT /:authId/vitals
  - Update vitals, auto-BMI calculation with validation.
- DELETE /:authId
  - Admin-only delete.

4) medicRoutes.js (base: /api/medics)
- POST /
- GET /
- GET /:id
- PUT /:id
- DELETE /:id
  - CRUD operations over Medic model.

5) medicalRecordRoutes.js (base: /api/records)
- GET /
- POST /
- GET /patient/:authId
- GET /:id
- PUT /:id
- DELETE /:id
  - Medical record creation/query and owner medic checks for updates/deletes.

6) emergencyContactRoutes.js (base: /api/emergency-contacts)
- POST /
- GET /:patientId
- PUT /:id
- DELETE /:id

7) medicationLogRoutes.js (base: /api/medication-log)
- POST /
  - Logs medication administration and creates MedicalRecord entry.
- GET /patient/:patientId
- GET /

8) AnalyticRoutes.js (expected base: /api/analytics)
- Scan analytics:
  - GET /scans
  - GET /scans/:id
  - POST /scans
  - PUT /scans/:id
  - DELETE /scans/:id
  - GET /scans-stats/:medicId
- Practice analytics:
  - GET /practice/:medicId
  - POST /practice
  - GET /practice-comparison/:medicId
- Monthly analytics:
  - GET /monthly/:medicId
  - POST /monthly/generate
- Alert analytics:
  - GET /alerts
  - POST /alerts
  - PATCH /alerts/:id/status
  - GET /alerts-stats/:medicId
- System/patient/medic performance:
  - GET /system
  - POST /system
  - GET /patient-activity
  - POST /patient-activity
  - GET /medic-performance/:medicId
  - POST /medic-performance
  - GET /real-time
  - POST /real-time
- Predictive and summary:
  - GET /predictive/:medicId
  - POST /predictive/generate
  - GET /dashboard-summary/:medicId
  - GET /platform-stats
  - GET /trends/:medicId
  - POST /track-scan
  - GET /recent-logs/:medicId
  - GET /blood-types/:medicId
  - GET /top-medical-conditions/:medicId
  - GET /common-allergies/:medicId
  - GET /peak-hours/:medicId
  - GET /summary/:medicId
  - GET /dashboard/:medicId

#### Present but not wired in backend/app.js

- academicDocRoutes.js
  - GET /pdf (intended for /api/academic-doc/pdf if mounted)
- Profile.js
  - Empty file in routes directory.

### 5.5 backend/src/services

- pdfCardGenerator.js
  - Uses PDFKit + Sharp to produce CR80-style printable health card PDF.
  - Accepts patient data, QR image buffer, optional profile image.

- academicDocPdfGenerator.js
  - Generates simple academic documentation PDF buffer.

### 5.6 backend/src/utils

- healthIdGenerator.js
  - Generates unique EMH-XXXXXX health IDs with fallback strategy.

### 5.7 backend/src/scripts

- addHealthIds.js
  - Backfills missing healthId values for existing patients.

- fixQrCodeIdIndex.js
  - Rebuilds qrMetadata.qrCodeId as sparse unique index to avoid null duplicate issues.

### 5.8 backend/tests

- health.test.js
  - Simple health endpoint test for GET /.

## 6. Frontend Folder Deep Dive

### 6.1 Frontend App Entry

- frontend/src/main.jsx
  - Initializes offline cache and renders App under Redux Provider.

- frontend/src/App.jsx
  - Defines routes and PrivateRoute guard.
  - Restores session by dispatching loadUserFromSession.
  - Routes:
    - Public:
      - /login
      - /register
      - /auth/callback
      - /enterprise-docs
    - Protected:
      - /welcome
      - /scanner
      - /dashboard
      - /patient/dashboard
      - /medic-dashboard

### 6.2 Frontend Pages

- Login.jsx
  - User sign-in with role-based redirect handling.

- Register.jsx
  - Sign-up flow with confirmation messaging.

- OAuthCallback.jsx
  - Handles Supabase OAuth callback session finalization.

- PatientDashboard.jsx
  - Patient main workspace:
    - Loads patient profile data
    - Loads emergency contacts, medications, QR image/data, records
    - Supports tab persistence and responsive behavior
    - Supports profile photo upload

- MedicDashboard.jsx
  - Medic workspace:
    - Scanner modal and scanned patient handling
    - Emergency view rendering
    - Analytics loading and scan tracking
    - Recent scan history and offline fallback usage

- WelcomeSetup.jsx
  - Initial patient onboarding/profile creation wizard.

- Documentation.jsx
  - Docs/enterprise informational page.

### 6.3 Frontend Components

- AnalyticsChart.jsx
- AnalyticsView.jsx
- EditableBasicInfo.jsx
- EditableEmergencyContacts.jsx
- EditableHealthVitals.jsx
- EmergencyContacts.jsx
- EmergencyPatientView.jsx
- ErrorBoundary.jsx
- HealthIDCard.jsx
- HealthSummary.jsx
- Medications.jsx
- PatientRouteGuard.jsx
- QRScanner.jsx
- QRScannerModal.jsx
- RecentVisits.jsx

Component role summary:
- Dashboard display components: HealthSummary, RecentVisits, Medications, EmergencyContacts
- Edit components: EditableBasicInfo, EditableEmergencyContacts, EditableHealthVitals
- Emergency flow: QRScanner, QRScannerModal, EmergencyPatientView
- Analytics: AnalyticsView + AnalyticsChart
- System wrappers: ErrorBoundary, PatientRouteGuard
- Card export: HealthIDCard

### 6.4 Frontend Store

- store/index.js
  - Redux store with auth and mobile reducers.

- store/authSlice.js
  - Thunks for login/register/session refresh/OAuth callback/logout.
  - Fetches profile role from backend via /api/profiles.
  - Maintains user/session/role/loading/error state.

- store/mobileSlice.js
  - Tracks isMobile state for responsive behavior.

### 6.5 Frontend Config

- config/apiClient.js
  - Central API wrapper:
    - Token and x-auth-id header injection
    - Handles JSON and blob responses
    - Detects HTML error pages from bad endpoints/proxy mismatch

- config/env.js
  - Exposes API and Supabase config values from Vite env.

### 6.6 Frontend Utils

- supabaseClient.js
  - Initializes Supabase client.

- offlineCache.js
  - Local cache utilities for patient scan/offline support.

- emergencyUtils.js
  - Priority and emergency-support helper functions.

## 7. Integration and Data Flow

### 7.1 Patient Flow
1. Register/login via Supabase on frontend.
2. Auth slice ensures profile exists in backend (POST /api/profiles if needed).
3. Patient dashboard requests /api/patients/:authId.
4. If absent, onboarding through /welcome creates patient document.
5. Dashboard allows editing basic info/vitals/contacts and viewing QR/card.

### 7.2 Medic Emergency Scan Flow
1. Medic logs in and opens MedicDashboard.
2. Uses scanner modal to decode QR payload.
3. Optionally fetches full patient data from backend.
4. EmergencyPatientView computes priority and clinical hints.
5. Scan telemetry is posted to analytics endpoints.

### 7.3 Health ID Card Flow
1. Frontend requests /api/qr/card-pdf/:authId with token + x-auth-id.
2. Backend verifies identity match.
3. Backend generates QR and card PDF.
4. Browser downloads Health_ID_<id>.pdf.

## 8. Environment and Run Commands

### Root
- npm install

### Backend
- cd backend
- npm install
- npm run dev
- npm test

Required backend env vars:
- PORT
- MONGO_URI
- SUPABASE_URL
- SUPABASE_ANON_KEY
- FRONTEND_URL (comma-separated allowed origins)

### Frontend
- cd frontend
- npm install
- npm run dev

Useful frontend env vars:
- VITE_API_BASE_URL (optional if using Vite proxy)
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

## 9. Known Inconsistencies and Technical Risks

1. Route filename case mismatch risk:
- app.js imports ./src/routes/analyticRoutes.js (lowercase)
- file present is AnalyticRoutes.js (uppercase A)
- Works on case-insensitive systems, can fail on Linux deployments.

2. Unmounted route module:
- academicDocRoutes.js exists but is not mounted in app.js.

3. Empty/placeholder files:
- backend/src/routes/Profile.js is empty.
- backend/src/controllers/qrController.js is empty.

4. Auth strictness inconsistency:
- Some endpoints rely on requireRole.
- Several CRUD endpoints (medics, records, contacts, many analytics) have no hard auth guard.

5. Data duplication model:
- Emergency contacts exist both in Patient.emergencyInfo.primaryEmergencyContacts and EmergencyContact collection.
- Potential drift if both are written independently.

6. QR payload encoding naming:
- Function named encryptQRData uses base64 encoding, not encryption.

7. Mixed module style in backend models:
- Most backend uses ESM exports/imports.
- Document.js uses CommonJS module.exports/require style.

## 10. Quick File Index by Area

Backend core:
- backend/app.js
- backend/src/config/db.js
- backend/src/middleware/*
- backend/src/models/*
- backend/src/routes/*
- backend/src/services/*
- backend/src/utils/*
- backend/src/scripts/*
- backend/tests/health.test.js

Frontend core:
- frontend/src/main.jsx
- frontend/src/App.jsx
- frontend/src/pages/*
- frontend/src/components/*
- frontend/src/store/*
- frontend/src/config/*
- frontend/src/utils/*

Operational scripts:
- start-ngrok.ps1
- start-ngrok.sh
- start-single-ngrok.ps1

---

This document is intended as a full technical map of how the current codebase operates and what it contains at component/API/page/model/script level.

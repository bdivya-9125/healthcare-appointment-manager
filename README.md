# Healthcare Appointment & Follow-up Manager

A full-stack healthcare appointment platform with separate portals for patients, doctors, and admins. Patients can book appointments and share symptoms in advance, doctors get AI-generated pre-visit summaries and can submit post-visit notes, and both sides receive email and Google Calendar notifications.

## Tech Stack
- **Backend:** Node.js, Express
- **Frontend:** React (Vite)
- **Database:** PostgreSQL (Supabase)
- **Cache/Locking:** Redis (Upstash)
- **LLM:** Google Gemini API
- **Email:** SendGrid
- **Calendar:** Google Calendar API (OAuth 2.0)
- **Auth:** JWT with role-based access control

## Setup Guide

### Backend
1. `cd backend`
2. `npm install`
3. Copy `.env.example` to `.env` and fill in all values (see below)
4. Run the SQL in `schema.sql` against your Postgres database
5. `node server.js`

### Frontend
1. `cd frontend`
2. `npm install`
3. Create `.env` with `VITE_API_URL=http://localhost:5000`
4. `npm run dev`

## Environment Variables (.env.example)
See `backend/.env.example` for the full list. Required variables:
- `DATABASE_URL` - Postgres connection string (Supabase pooler recommended)
- `REDIS_URL` - Upstash Redis connection string
- `JWT_SECRET` - random secret string for signing JWTs
- `LLM_API_KEY` - Google Gemini API key
- `SENDGRID_API_KEY` - SendGrid API key
- `SENDER_EMAIL` - verified SendGrid sender email
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` - Google Cloud OAuth credentials

## Google Calendar Setup
1. Create a project in Google Cloud Console
2. Enable the Google Calendar API
3. Configure the OAuth consent screen (External, add test users)
4. Create an OAuth Client ID (Web application) with redirect URI: `http://localhost:5000/auth/google/callback`
5. Add the Client ID/Secret to `.env`
6. Users connect their calendar via `GET /auth/google`, which returns a consent URL

## Database Schema
See `schema.sql` for the full schema. Key tables: `users`, `doctors`, `doctor_leaves`, `slots`, `appointments`, `notifications_log`.

## API Overview

### Auth
- `POST /auth/signup` - register (patient/doctor/admin)
- `POST /auth/login` - returns JWT
- `GET /auth/google` - get Google OAuth consent URL (requires auth)
- `GET /auth/google/callback` - OAuth callback, stores tokens

### Admin
- `POST /admin/doctors` - create doctor profile
- `PUT /admin/doctors/:id` - edit doctor profile
- `GET /admin/doctors` - list/search doctors
- `POST /admin/doctors/:id/leave` - mark doctor on leave, cancels affected appointments and notifies patients
- `POST /admin/doctors/:id/generate-slots` - generate bookable slots from working hours

### Patient
- `GET /patient/doctors` - search doctors
- `GET /patient/doctors/:id/slots` - view open slots
- `POST /patient/slots/:id/hold` - hold a slot (5 min Redis lock)
- `POST /patient/slots/:id/confirm` - confirm booking (transaction-safe), triggers LLM pre-visit summary, email, and calendar event

### Doctor
- `GET /doctor/appointments` - view confirmed appointments with pre-visit summaries
- `POST /doctor/appointments/:id/complete` - submit notes/prescription, triggers LLM post-visit summary

## LLM Prompts Used

**Pre-visit summary:**
> Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: <symptoms>

**Post-visit summary:**
> Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: <notes>

Both calls have a 10-second timeout and graceful failure handling - if the LLM fails, the booking/visit-completion still succeeds, and the failure reason is logged in the database.

## Test Credentials
- Admin: admin@test.com / admin1234
- Doctor: drsmith@test.com / doctor1234
- Patient: patient2@test.com / test1234

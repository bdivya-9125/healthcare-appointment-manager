# Healthcare Appointment & Follow-up Manager

## Live Demo

- **Application:** https://fascinating-manatee-0c33aa.netlify.app
- **Backend API:** https://healthcare-appointment-manager-production-ed2d.up.railway.app
- **GitHub Repository:** https://github.com/bdivya-9125/healthcare-appointment-manager

---

## Demo Credentials

Use these test accounts to verify the deployed application.

### Admin
- **Email:** `admin@test.com`
- **Password:** `admin1234`

### Doctor
- **Email:** `drsmith@test.com`
- **Password:** `doctor1234`

### Patient
- **Email:** `patient2@test.com`
- **Password:** `test1234`

> These are demo credentials provided for evaluation purposes.

---

## Overview

Healthcare Appointment & Follow-up Manager is a full-stack healthcare appointment platform with separate portals for patients, doctors, and administrators.

### Patient Features
- User registration and login
- Search doctors
- View available appointment slots
- Temporarily hold appointment slots
- Book appointments
- Submit symptoms before a visit
- View appointment details

### Doctor Features
- Doctor login
- View confirmed appointments
- View AI-generated pre-visit summaries
- Review patient symptoms
- Add post-visit clinical notes
- Add prescriptions
- Generate patient-friendly post-visit summaries
- Schedule medication reminders

### Admin Features
- Manage doctor profiles
- Manage doctor availability
- Mark doctors as unavailable
- Generate appointment slots

---

## Key Features

- Role-based authentication for patients, doctors, and admins
- JWT-based authentication
- Secure password hashing using bcrypt
- Transaction-safe appointment booking
- Redis-based temporary slot locking
- Google Gemini AI integration
- Google Calendar integration
- PostgreSQL database
- Background medication reminder processing
- Email notification workflow

---

## AI Features

### Pre-Visit AI Summary

When a patient books an appointment and provides symptoms, Google Gemini analyzes the symptoms and generates:

- Urgency level: Low, Medium, or High
- Chief complaint
- Exactly three suggested questions for the doctor

### Post-Visit AI Summary

After completing a visit, the doctor's clinical notes are converted into a patient-friendly summary containing:

- What was discussed
- Medication schedule
- Follow-up steps

AI failures are handled gracefully so that appointment booking and visit completion can continue even if the LLM service is temporarily unavailable.

---

## Medication Reminders

When a doctor completes a visit with a prescription, medication reminder records are created in PostgreSQL.

A background cron job periodically checks for due reminders and processes them.

```text
Doctor completes visit
        ↓
Prescription saved
        ↓
Medication reminders created
        ↓
Background reminder job
        ↓
Due reminder detected
        ↓
Patient notification
````

---

## Google Calendar Integration

The application supports Google Calendar OAuth 2.0 integration.

When a patient has connected their Google Calendar, an appointment can be added to their calendar after booking.

---

## Email Notifications

The application includes an email notification workflow using Resend.

Email notifications are integrated with:

* Appointment booking
* Doctor appointment notifications
* Medication reminders

> The deployed Resend configuration currently uses the testing sender. Production email delivery to arbitrary recipient addresses requires a verified sending domain.

---

## Technology Stack

| Component       | Technology            |
| --------------- | --------------------- |
| Frontend        | React + Vite          |
| Backend         | Node.js + Express     |
| Database        | PostgreSQL / Supabase |
| Cache & Locking | Redis / Upstash       |
| AI              | Google Gemini API     |
| Authentication  | JWT + bcrypt          |
| Calendar        | Google Calendar API   |
| Email           | Resend                |
| Deployment      | Netlify + Railway     |

---
## Development Tools

- Postman — API testing
- Git & GitHub — Version control
- VS Code — Development

## API Overview

### Authentication

* `POST /auth/signup` — Register a user
* `POST /auth/login` — Authenticate a user and return JWT
* `GET /auth/google` — Start Google Calendar OAuth
* `GET /auth/google/callback` — Handle Google OAuth callback

### Patient

* `GET /patient/doctors` — Search doctors
* `GET /patient/doctors/:id/slots` — View available slots
* `POST /patient/slots/:id/hold` — Temporarily hold a slot
* `POST /patient/slots/:id/confirm` — Confirm an appointment

### Doctor

* `GET /doctor/appointments` — View confirmed appointments
* `GET /doctor/appointments/:id/pre-visit-summary` — Get AI pre-visit summary
* `POST /doctor/appointments/:id/complete` — Complete a visit

### Admin

* `POST /admin/doctors` — Create doctor profile
* `PUT /admin/doctors/:id` — Update doctor profile
* `GET /admin/doctors` — List/search doctors
* `POST /admin/doctors/:id/leave` — Mark doctor unavailable
* `POST /admin/doctors/:id/generate-slots` — Generate appointment slots

---

## Database

The application uses PostgreSQL.

Main tables include:

* `users`
* `doctors`
* `doctor_leaves`
* `slots`
* `appointments`
* `medication_reminders`
* `notifications_log`

The complete database schema is available in:

```text
backend/schema.sql
```

---

## Project Structure

```text
healthcare-appointment-manager/
│
├── backend/
│   ├── jobs/
│   ├── middleware/
│   ├── routes/
│   ├── utils/
│   ├── db.js
│   ├── redis.js
│   ├── schema.sql
│   └── server.js
│
├── frontend/
│   └── src/
│       ├── pages/
│       ├── api.js
│       └── App.jsx
│
└── README.md
```

---

## Local Setup

### Backend

```bash
cd backend
npm install
node server.js
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Create the required environment variables using the provided `.env.example` files.

---

## Environment Variables

The following variables are required for the complete application:

```text
DATABASE_URL
REDIS_URL
JWT_SECRET
LLM_API_KEY
RESEND_API_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
```

> Never commit `.env` files, API keys, database credentials, or other secrets to GitHub.

---

## Error Handling

The application includes graceful handling for:

* Invalid login credentials
* Unavailable appointment slots
* Concurrent slot booking
* LLM/API failures
* Email failures
* Google Calendar failures
* Database errors

External-service failures are logged without unnecessarily preventing the core appointment workflow from completing.

---

## Evaluation Flow

For a quick demonstration:

1. Log in using the **Patient** credentials.
2. Search for a doctor.
3. Select an available appointment slot.
4. Enter patient symptoms.
5. Confirm the appointment.
6. Verify the AI pre-visit summary.
7. Log out and log in using the **Doctor** credentials.
8. Open the appointment.
9. Review the AI-generated pre-visit summary.
10. Complete the visit with notes and a prescription.
11. Verify that medication reminders are created.
12. Google Calendar can be tested if the account is connected.

---

## Repository

GitHub:

[https://github.com/bdivya-9125/healthcare-appointment-manager](https://github.com/bdivya-9125/healthcare-appointment-manager)

## Live Application

[https://fascinating-manatee-0c33aa.netlify.app](https://fascinating-manatee-0c33aa.netlify.app)



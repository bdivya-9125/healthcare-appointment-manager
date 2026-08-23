# System Design Write-up

## Slot Hold Mechanism

When a patient selects a slot, the system places a short-lived lock in Redis using `SET key value NX EX 300` — the `NX` flag ensures the key is only set if it does not already exist, and `EX 300` auto-expires it after 5 minutes. If another patient tries to hold the same slot while it is locked, the `SET` call returns null and the request is rejected with a 409 Conflict. This gives the patient a window to fill in their symptom form without losing the slot to a race, while guaranteeing the lock cannot leak permanently if the patient abandons the booking flow.

## Double-Booking Prevention

The hold is a soft, advisory lock; the actual guarantee against double-booking comes from the database layer. When a patient confirms a booking, the request opens a Postgres transaction and runs `SELECT * FROM slots WHERE id= AND status='open' FOR UPDATE`. The `FOR UPDATE` clause takes a row-level lock, so if two confirm requests for the same slot arrive concurrently, the second one blocks until the first transaction commits or rolls back, then re-reads the row and finds `status` is no longer `'open'`, causing it to roll back and return a 409. As a second layer of defense, `appointments.slot_id` has a `UNIQUE` constraint, so even in the unlikely case both requests read `'open'` before either commits, the second `INSERT` fails on the unique constraint and is caught explicitly (Postgres error code `23505`) and converted into a clean 409 response rather than a 500. This two-layer approach (row lock + unique constraint) means double-booking is prevented at the database level regardless of application-level race conditions, Redis downtime, or multiple server instances.

## Doctor Leave Conflict Handling

When an admin marks a doctor on leave for a specific date, the system first inserts a row into `doctor_leaves`. It then queries all `confirmed` appointments for that doctor on that date by joining `appointments` to `slots`. For each affected appointment, the system updates its status to `'cancelled'`, sends a cancellation email to the patient, and logs the notification attempt (success or failure) into `notifications_log`. This is done synchronously in the request for simplicity in this implementation, but the notification step is wrapped so that an email failure does not prevent the appointment from being cancelled — cancellation and notification are treated as separate concerns, and the log table means any failed notifications are visible and could be retried by a background job.

The slot generation logic separately checks `doctor_leaves` before creating future slots, so once a doctor is marked on leave, no new slots are ever generated for that date, preventing new bookings on a day the doctor is unavailable.

## Notification Failure Handling

Every notification (booking confirmation, cancellation) goes through a single `sendEmail` utility that wraps the SendGrid call in a try/catch and returns a structured `{success, error}` result rather than throwing. The calling code always logs the outcome to `notifications_log` with a `status` of `'sent'` or `'failed'` and a `retry_count`. This design was deliberately tested against real failure conditions during development: SendGrid rejected emails to an unverified sender and to a non-existent test domain, and in both cases the booking and cancellation flows completed successfully while the failure was captured in the log with the underlying error message preserved in the `payload` column. This gives a clear audit trail and a foundation for a background retry worker (not implemented in this version, but the schema and logging support it directly - a cron job could poll `notifications_log` for `status='failed'` rows below a retry threshold and re-attempt delivery with exponential backoff).

## LLM Integration and Failure Handling

Both the pre-visit and post-visit LLM calls are wrapped in a `Promise.race` against a 10-second timeout, and the whole call is inside a try/catch. If the LLM call fails or times out (this was observed in practice during testing, including a genuine `503` "high demand" response from the Gemini API), the system stores a structured failure object (`{status:'failed', error: ...}`) in place of the summary and proceeds with the booking or visit-completion regardless. This guarantees that an external LLM outage never blocks the core clinical workflow of booking an appointment or completing a visit — it only degrades the quality of the pre/post-visit summary shown to the doctor or patient, which is the correct trade-off for a healthcare scheduling system where availability of the core booking function matters more than the AI-generated summary.

## Google Calendar Integration

Calendar access uses OAuth 2.0 with offline access and a refresh token, so events can be created without requiring the user to re-authenticate on every booking. Tokens are stored per-user in the database. Event creation is wrapped in the same try/catch pattern as email and LLM calls, so a Calendar API failure or a user who has not connected their calendar does not block booking confirmation.

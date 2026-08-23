const express = require('express');
const router = express.Router();

const pool = require('../db');
const redis = require('../redis');
const sendEmail = require('../utils/email');

const {
  requireAuth,
  requireRole
} = require('../middleware/auth');

const {
  getPreVisitSummary
} = require('../utils/llm');

const {
  createCalendarEvent
} = require('../utils/googleCalendar');


// =====================================================
// GET ALL DOCTORS
// =====================================================
router.get(
  '/doctors',
  requireAuth,
  async (req, res) => {
    try {
      const { specialisation } = req.query;

      let query = 'SELECT * FROM doctors';
      let params = [];

      if (specialisation) {
        query += ' WHERE specialisation ILIKE $1';
        params.push(`%${specialisation}%`);
      }

      const result = await pool.query(
        query,
        params
      );

      res.json({
        success: true,
        doctors: result.rows
      });

    } catch (err) {
      console.error(
        'Get doctors error:',
        err.message
      );

      res.status(500).json({
        error: err.message
      });
    }
  }
);


// =====================================================
// GET DOCTOR SLOTS
// =====================================================
router.get(
  '/doctors/:id/slots',
  requireAuth,
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT *
         FROM slots
         WHERE doctor_id=$1
           AND status='open'
         ORDER BY start_time ASC`,
        [req.params.id]
      );

      res.json({
        success: true,
        slots: result.rows
      });

    } catch (err) {
      console.error(
        'Get slots error:',
        err.message
      );

      res.status(500).json({
        error: err.message
      });
    }
  }
);


// =====================================================
// HOLD SLOT
// =====================================================
router.post(
  '/slots/:id/hold',
  requireAuth,
  requireRole('patient'),
  async (req, res) => {
    try {
      const key =
        `hold:slot:${req.params.id}`;

      const result = await redis.set(
        key,
        req.user.id,
        'NX',
        'EX',
        300
      );

      if (result === null) {
        return res.status(409).json({
          error:
            'Slot is currently held by someone else'
        });
      }

      res.json({
        success: true,
        message:
          'Slot held for 5 minutes'
      });

    } catch (err) {
      console.error(
        'Hold slot error:',
        err.message
      );

      res.status(500).json({
        error: err.message
      });
    }
  }
);


// =====================================================
// CONFIRM APPOINTMENT
// =====================================================
router.post(
  '/slots/:id/confirm',
  requireAuth,
  requireRole('patient'),
  async (req, res) => {

    const client = await pool.connect();

    try {
      const slotId = req.params.id;
      const { symptoms } = req.body;

      // -------------------------------------------------
      // START TRANSACTION
      // -------------------------------------------------
      await client.query('BEGIN');

      // -------------------------------------------------
      // LOCK SLOT
      // -------------------------------------------------
      const slotRes = await client.query(
        `SELECT *
         FROM slots
         WHERE id=$1
           AND status=$2
         FOR UPDATE`,
        [
          slotId,
          'open'
        ]
      );

      if (slotRes.rows.length === 0) {

        await client.query(
          'ROLLBACK'
        );

        return res.status(409).json({
          error:
            'Slot no longer available'
        });
      }

      const slot = slotRes.rows[0];

      // -------------------------------------------------
      // BOOK SLOT
      // -------------------------------------------------
      await client.query(
        `UPDATE slots
         SET status=$1
         WHERE id=$2`,
        [
          'booked',
          slotId
        ]
      );

      // -------------------------------------------------
      // CREATE APPOINTMENT
      // -------------------------------------------------
      const apptRes = await client.query(
        `INSERT INTO appointments
         (
           slot_id,
           patient_id,
           symptom_form,
           status
         )
         VALUES
         (
           $1,
           $2,
           $3,
           'confirmed'
         )
         RETURNING *`,
        [
          slotId,
          req.user.id,
          symptoms || null
        ]
      );

      await client.query(
        'COMMIT'
      );

      const appointment =
        apptRes.rows[0];

      // -------------------------------------------------
      // REMOVE REDIS HOLD
      // -------------------------------------------------
      await redis.del(
        `hold:slot:${slotId}`
      );


      // =================================================
      // AI PRE-VISIT SUMMARY
      // =================================================
      let preVisitSummary = {
        status: 'failed'
      };

      try {

        preVisitSummary =
          await getPreVisitSummary(
            symptoms || ''
          );

        await pool.query(
          `UPDATE appointments
           SET pre_visit_summary=$1
           WHERE id=$2`,
          [
            JSON.stringify(
              preVisitSummary
            ),
            appointment.id
          ]
        );

      } catch (llmErr) {

        console.error(
          'LLM pre-visit summary failed:',
          llmErr.message
        );

        await pool.query(
          `UPDATE appointments
           SET pre_visit_summary=$1
           WHERE id=$2`,
          [
            JSON.stringify({
              status: 'failed',
              error: llmErr.message
            }),
            appointment.id
          ]
        );
      }


      // =================================================
      // GET PATIENT + DOCTOR EMAIL DETAILS
      // =================================================
      let patient = null;
      let doctor = null;

      try {

        const peopleRes =
          await pool.query(
            `SELECT
               pu.email AS patient_email,
               pu.name AS patient_name,
               du.email AS doctor_email,
               du.name AS doctor_name,
               d.specialisation
             FROM appointments a
             JOIN users pu
               ON pu.id = a.patient_id
             JOIN slots s
               ON s.id = a.slot_id
             JOIN doctors d
               ON d.id = s.doctor_id
             JOIN users du
               ON du.id = d.user_id
             WHERE a.id = $1`,
            [appointment.id]
          );

        if (
          peopleRes.rows.length > 0
        ) {
          const person =
            peopleRes.rows[0];

          patient = {
            email:
              person.patient_email,
            name:
              person.patient_name
          };

          doctor = {
            email:
              person.doctor_email,
            name:
              person.doctor_name,
            specialisation:
              person.specialisation
          };
        }

      } catch (peopleErr) {

        console.error(
          'Failed to get email details:',
          peopleErr.message
        );
      }


      // =================================================
      // SEND EMAIL TO PATIENT
      // =================================================
      if (patient?.email) {

        try {

          const emailResult =
            await sendEmail(
              patient.email,
              'Appointment Confirmed',
              `Hi ${patient.name},

Your appointment has been successfully confirmed.

Doctor: ${
                doctor?.name ||
                'Your selected doctor'
              }

Date: ${
                new Date(
                  slot.start_time
                ).toLocaleDateString()
              }

Time: ${
                new Date(
                  slot.start_time
                ).toLocaleTimeString()
              }

Symptoms:
${
                symptoms ||
                'Not provided'
              }

Please be available at the scheduled time.

Thank you.`
            );

          await pool.query(
            `INSERT INTO notifications_log
             (
               type,
               recipient,
               payload,
               status,
               retry_count
             )
             VALUES
             (
               $1,
               $2,
               $3,
               $4,
               $5
             )`,
            [
              'booking_confirmation_patient',
              patient.email,
              JSON.stringify({
                appointment_id:
                  appointment.id
              }),
              emailResult.success
                ? 'sent'
                : 'failed',
              emailResult.success
                ? 0
                : 1
            ]
          );

        } catch (emailErr) {

          console.error(
            'Patient confirmation email failed:',
            emailErr.message
          );
        }
      }


      // =================================================
      // SEND EMAIL TO DOCTOR
      // =================================================
      if (doctor?.email) {

        try {

          const emailResult =
            await sendEmail(
              doctor.email,
              'New Appointment Booked',
              `Hello Dr. ${
                doctor.name
              },

A new patient appointment has been booked.

Patient:
${
                patient?.name ||
                'Patient'
              }

Appointment Date:
${
                new Date(
                  slot.start_time
                ).toLocaleDateString()
              }

Appointment Time:
${
                new Date(
                  slot.start_time
                ).toLocaleTimeString()
              }

Symptoms:
${
                symptoms ||
                'Not provided'
              }

Please check your doctor dashboard for the appointment details.

Thank you.`
            );

          await pool.query(
            `INSERT INTO notifications_log
             (
               type,
               recipient,
               payload,
               status,
               retry_count
             )
             VALUES
             (
               $1,
               $2,
               $3,
               $4,
               $5
             )`,
            [
              'booking_confirmation_doctor',
              doctor.email,
              JSON.stringify({
                appointment_id:
                  appointment.id
              }),
              emailResult.success
                ? 'sent'
                : 'failed',
              emailResult.success
                ? 0
                : 1
            ]
          );

        } catch (emailErr) {

          console.error(
            'Doctor notification email failed:',
            emailErr.message
          );
        }
      }


      // =================================================
      // GOOGLE CALENDAR
      // Patient's connected calendar
      // =================================================
      try {

        const userRes =
          await pool.query(
            `SELECT
               google_tokens,
               email,
               name
             FROM users
             WHERE id=$1`,
            [req.user.id]
          );

        if (
          userRes.rows.length > 0
        ) {

          const user =
            userRes.rows[0];

          const userGoogleTokens =
            user.google_tokens;

          if (userGoogleTokens) {

            const eventId =
              await createCalendarEvent(
                userGoogleTokens,
                {
                  summary:
                    'Doctor Appointment',

                  description:
                    `Appointment booked. Symptoms: ${
                      symptoms ||
                      'N/A'
                    }`,

                  startTime:
                    slot.start_time,

                  endTime:
                    slot.end_time,

                  attendeeEmail:
                    user.email
                }
              );

            await pool.query(
              `UPDATE appointments
               SET calendar_event_id=$1
               WHERE id=$2`,
              [
                eventId,
                appointment.id
              ]
            );
          }
        }

      } catch (calErr) {

        console.error(
          'Calendar event creation failed:',
          calErr.message
        );
      }


      // =================================================
      // GET FINAL APPOINTMENT
      // =================================================
      const finalAppt =
        await pool.query(
          `SELECT *
           FROM appointments
           WHERE id=$1`,
          [appointment.id]
        );

      res.json({
        success: true,
        appointment:
          finalAppt.rows[0]
      });

    } catch (err) {

      try {
        await client.query(
          'ROLLBACK'
        );
      } catch (rollbackErr) {
        console.error(
          'Rollback failed:',
          rollbackErr.message
        );
      }

      console.error(
        'Appointment confirmation error:',
        err
      );

      if (
        err.code === '23505'
      ) {
        return res.status(409).json({
          error:
            'Slot already booked'
        });
      }

      res.status(500).json({
        error: err.message
      });

    } finally {

      client.release();
    }
  }
);


module.exports = router;
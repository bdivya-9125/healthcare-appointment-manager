const express = require('express');
const router = express.Router();

const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const {
  getPreVisitSummary,
  getPostVisitSummary
} = require('../utils/llm');

const { scheduleReminders } = require('../utils/scheduleReminders');


// =====================================================
// GET DOCTOR APPOINTMENTS
// IMPORTANT: Do NOT call Gemini here.
// This makes the dashboard load immediately.
// =====================================================
router.get(
  '/appointments',
  requireAuth,
  requireRole('doctor'),
  async (req, res) => {
    try {
      const doctorRes = await pool.query(
        'SELECT id FROM doctors WHERE user_id=$1',
        [req.user.id]
      );

      if (doctorRes.rows.length === 0) {
        return res.status(404).json({
          error: 'Doctor profile not found'
        });
      }

      const doctorId = doctorRes.rows[0].id;

      const result = await pool.query(
        `SELECT
           a.*,
           s.start_time,
           s.end_time,
           u.name AS patient_name
         FROM appointments a
         JOIN slots s ON a.slot_id = s.id
         JOIN users u ON a.patient_id = u.id
         WHERE s.doctor_id = $1
           AND a.status = 'confirmed'
         ORDER BY s.start_time ASC`,
        [doctorId]
      );

      // Return immediately.
      // Gemini is NOT called here.
      res.json({
        success: true,
        appointments: result.rows
      });

    } catch (err) {
      console.error('Doctor appointments error:', err);

      res.status(500).json({
        error: err.message
      });
    }
  }
);


// =====================================================
// GET AI PRE-VISIT SUMMARY FOR ONE APPOINTMENT
// =====================================================
router.get(
  '/appointments/:id/pre-visit-summary',
  requireAuth,
  requireRole('doctor'),
  async (req, res) => {
    try {
      const appointmentId = req.params.id;

      // Get appointment + verify it belongs to this doctor
      const result = await pool.query(
        `SELECT
           a.id,
           a.symptom_form,
           a.pre_visit_summary,
           s.doctor_id
         FROM appointments a
         JOIN slots s ON a.slot_id = s.id
         JOIN doctors d ON s.doctor_id = d.id
         WHERE a.id = $1
           AND d.user_id = $2`,
        [appointmentId, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Appointment not found'
        });
      }

      const appointment = result.rows[0];

      // Already generated? Return it immediately.
      if (appointment.pre_visit_summary) {
        let summary = appointment.pre_visit_summary;

        if (typeof summary === 'string') {
          try {
            summary = JSON.parse(summary);
          } catch {
            summary = null;
          }
        }

        if (summary) {
          return res.json({
            success: true,
            summary
          });
        }
      }

      if (!appointment.symptom_form) {
        return res.json({
          success: true,
          summary: null
        });
      }

      console.log(
        `Generating AI summary for appointment ${appointmentId}`
      );

      // Gemini is called ONLY for this appointment.
      const summary = await getPreVisitSummary(
        appointment.symptom_form
      );

      // Save result
      await pool.query(
        `UPDATE appointments
         SET pre_visit_summary = $1
         WHERE id = $2`,
        [
          JSON.stringify(summary),
          appointmentId
        ]
      );

      console.log(
        `AI summary saved for appointment ${appointmentId}`
      );

      res.json({
        success: true,
        summary
      });

    } catch (err) {
      console.error(
        'Pre-visit AI error:',
        err.message
      );

      res.status(500).json({
        error: err.message
      });
    }
  }
);


// =====================================================
// COMPLETE VISIT
// =====================================================
router.post(
  '/appointments/:id/complete',
  requireAuth,
  requireRole('doctor'),
  async (req, res) => {
    try {
      const { notes, prescription } = req.body;

      if (!notes) {
        return res.status(400).json({
          error: 'notes required'
        });
      }

      let postVisitSummary =
        'Summary unavailable - please contact your doctor for details.';

      // Generate post-visit AI summary
      try {
        postVisitSummary =
          await getPostVisitSummary(notes);
      } catch (llmErr) {
        console.error(
          'LLM post-visit summary failed:',
          llmErr.message
        );
      }

      const result = await pool.query(
        `UPDATE appointments
         SET
           post_visit_notes = $1,
           prescription = $2,
           post_visit_summary = $3,
           status = 'completed'
         WHERE id = $4
         RETURNING *`,
        [
          notes,
          prescription
            ? JSON.stringify({ text: prescription })
            : null,
          postVisitSummary,
          req.params.id
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Appointment not found'
        });
      }

      const updatedAppointment = result.rows[0];

      // Schedule medication reminders
      if (prescription) {
        try {
          await scheduleReminders(pool, {
            appointmentId: updatedAppointment.id,
            patientId: updatedAppointment.patient_id,
            prescriptionText: prescription,
            startTime: new Date()
          });
        } catch (reminderErr) {
          console.error(
            'Failed to schedule medication reminders:',
            reminderErr.message
          );
        }
      }

      res.json({
        success: true,
        appointment: updatedAppointment
      });

    } catch (err) {
      console.error(
        'Complete visit error:',
        err
      );

      res.status(500).json({
        error: err.message
      });
    }
  }
);


module.exports = router;
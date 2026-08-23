const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  getPreVisitSummary,
  getPostVisitSummary
} = require('../utils/llm');
const { scheduleReminders } = require('../utils/scheduleReminders');

// Get today's and all confirmed appointments for the logged-in doctor
router.get(
  '/appointments',
  requireAuth,
  requireRole('doctor'),
  async (req, res) => {
    try {
      // Find doctor profile
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

      // Get confirmed appointments
      const result = await pool.query(
        `SELECT
           a.*,
           s.start_time,
           s.end_time,
           u.name AS patient_name
         FROM appointments a
         JOIN slots s ON a.slot_id = s.id
         JOIN users u ON a.patient_id = u.id
         WHERE s.doctor_id=$1
           AND a.status='confirmed'
         ORDER BY s.start_time ASC`,
        [doctorId]
      );

      const appointments = [];

      for (const appointment of result.rows) {
        let preVisitSummary = appointment.pre_visit_summary;

        // Convert JSON string to object if necessary
        if (typeof preVisitSummary === 'string') {
          try {
            preVisitSummary = JSON.parse(preVisitSummary);
          } catch (err) {
            console.error(
              `Invalid pre_visit_summary for appointment ${appointment.id}:`,
              err.message
            );
            preVisitSummary = null;
          }
        }

        /*
         * If AI summary is missing, generate it from the patient's
         * symptom form and store it in the database.
         */
        if (
          (!preVisitSummary ||
            typeof preVisitSummary !== 'object' ||
            !preVisitSummary.urgency) &&
          appointment.symptom_form
        ) {
          try {
            console.log(
              `Generating AI pre-visit summary for appointment ${appointment.id}...`
            );

            preVisitSummary = await getPreVisitSummary(
              appointment.symptom_form
            );

            // Save AI result in database
            await pool.query(
              `UPDATE appointments
               SET pre_visit_summary=$1
               WHERE id=$2`,
              [
                JSON.stringify(preVisitSummary),
                appointment.id
              ]
            );

            console.log(
              `AI pre-visit summary saved for appointment ${appointment.id}`
            );
          } catch (llmErr) {
            console.error(
              `LLM pre-visit summary failed for appointment ${appointment.id}:`,
              llmErr.message
            );

            // Don't break the doctor dashboard if Gemini fails
            preVisitSummary = null;
          }
        }

        appointments.push({
          ...appointment,
          pre_visit_summary: preVisitSummary
        });
      }

      res.json({
        success: true,
        appointments
      });
    } catch (err) {
      console.error('Doctor appointments error:', err);

      res.status(500).json({
        error: err.message
      });
    }
  }
);


// Complete a visit:
// submit notes + prescription +
// generate patient-friendly post-visit summary
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

      // Generate AI post-visit summary
      try {
        postVisitSummary = await getPostVisitSummary(notes);
      } catch (llmErr) {
        console.error(
          'LLM post-visit summary failed:',
          llmErr.message
        );
      }

      // Update appointment
      const result = await pool.query(
        `UPDATE appointments
         SET
           post_visit_notes=$1,
           prescription=$2,
           post_visit_summary=$3,
           status='completed'
         WHERE id=$4
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
      console.error('Complete visit error:', err);

      res.status(500).json({
        error: err.message
      });
    }
  }
);

module.exports = router;
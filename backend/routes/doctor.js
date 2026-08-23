const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { getPostVisitSummary } = require('../utils/llm');
const { scheduleReminders } = require('../utils/scheduleReminders');

// Get today's (and all) appointments for the logged-in doctor
router.get('/appointments', requireAuth, requireRole('doctor'), async (req, res) => {
  try {
    const doctorRes = await pool.query('SELECT id FROM doctors WHERE user_id=$1', [req.user.id]);
    if (doctorRes.rows.length === 0) return res.status(404).json({ error: 'Doctor profile not found' });
    const doctorId = doctorRes.rows[0].id;

    const result = await pool.query(
      `SELECT a.*, s.start_time, s.end_time, u.name as patient_name
       FROM appointments a
       JOIN slots s ON a.slot_id = s.id
       JOIN users u ON a.patient_id = u.id
       WHERE s.doctor_id=$1 AND a.status='confirmed'
       ORDER BY s.start_time ASC`,
      [doctorId]
    );
    res.json({ success: true, appointments: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Complete a visit: submit notes + prescription, get LLM patient-friendly summary
router.post('/appointments/:id/complete', requireAuth, requireRole('doctor'), async (req, res) => {
  try {
    const { notes, prescription } = req.body;
    if (!notes) return res.status(400).json({ error: 'notes required' });

    let postVisitSummary = 'Summary unavailable - please contact your doctor for details.';
    try {
      postVisitSummary = await getPostVisitSummary(notes);
    } catch (llmErr) {
      console.error('LLM post-visit summary failed:', llmErr.message);
    }

    const result = await pool.query(
      `UPDATE appointments
       SET post_visit_notes=$1, prescription=$2, post_visit_summary=$3, status='completed'
       WHERE id=$4 RETURNING *`,
      [notes, prescription ? JSON.stringify({ text: prescription }) : null, postVisitSummary, req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Appointment not found' });

    const updatedAppointment = result.rows[0];

    if (prescription) {
      try {
        await scheduleReminders(pool, {
          appointmentId: updatedAppointment.id,
          patientId: updatedAppointment.patient_id,
          prescriptionText: prescription,
          startTime: new Date(),
        });
      } catch (reminderErr) {
        console.error('Failed to schedule medication reminders:', reminderErr.message);
      }
    }

    res.json({ success: true, appointment: updatedAppointment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
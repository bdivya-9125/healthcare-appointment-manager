const express = require('express');
const router = express.Router();
const pool = require('../db');
const sendEmail = require('../utils/email');
const { requireAuth, requireRole } = require('../middleware/auth');
const generateSlotsForDoctor = require('../utils/generateSlots');

// Create a doctor profile
router.post('/doctors', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { user_id, specialisation, working_hours, slot_duration_min } = req.body;
    if (!user_id || !specialisation || !working_hours || !slot_duration_min) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const result = await pool.query(
      `INSERT INTO doctors(user_id, specialisation, working_hours, slot_duration_min)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [user_id, specialisation, working_hours, slot_duration_min]
    );
    res.json({ success: true, doctor: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit a doctor profile
router.put('/doctors/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { specialisation, working_hours, slot_duration_min } = req.body;
    const result = await pool.query(
      `UPDATE doctors SET specialisation=$1, working_hours=$2, slot_duration_min=$3
       WHERE id=$4 RETURNING *`,
      [specialisation, working_hours, slot_duration_min, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Doctor not found' });
    res.json({ success: true, doctor: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all doctors
router.get('/doctors', async (req, res) => {
  try {
    const { specialisation } = req.query;
    let query = 'SELECT * FROM doctors';
    let params = [];
    if (specialisation) {
      query += ' WHERE specialisation ILIKE $1';
      params.push(`%${specialisation}%`);
    }
    const result = await pool.query(query, params);
    res.json({ success: true, doctors: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark a doctor on leave — cancels affected appointments and notifies patients
router.post('/doctors/:id/leave', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { leave_date } = req.body;
    if (!leave_date) return res.status(400).json({ error: 'leave_date required' });

    await pool.query(
      'INSERT INTO doctor_leaves(doctor_id, leave_date) VALUES ($1,$2)',
      [req.params.id, leave_date]
    );

    const affected = await pool.query(
      `SELECT a.id, u.email, u.name FROM appointments a
       JOIN slots s ON a.slot_id = s.id
       JOIN users u ON a.patient_id = u.id
       WHERE s.doctor_id=$1 AND s.start_time::date=$2 AND a.status='confirmed'`,
      [req.params.id, leave_date]
    );

    for (const appt of affected.rows) {
      await pool.query('UPDATE appointments SET status=$1 WHERE id=$2', ['cancelled', appt.id]);

      const emailResult = await sendEmail(
        appt.email,
        'Appointment Cancelled - Doctor on Leave',
        `Hi ${appt.name}, your appointment has been cancelled because the doctor is on leave on ${leave_date}. Please rebook at your convenience.`
      );

      await pool.query(
        `INSERT INTO notifications_log(type, recipient, payload, status, retry_count)
         VALUES ($1,$2,$3,$4,$5)`,
        ['cancellation', appt.email, JSON.stringify({ appointment_id: appt.id, leave_date }), emailResult.success ? 'sent' : 'failed', emailResult.success ? 0 : 1]
      );
    }

    res.json({ success: true, message: 'Leave marked', affected_appointments: affected.rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/doctors/:id/generate-slots', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const count = await generateSlotsForDoctor(req.params.id);
    res.json({ success: true, message: `Generated up to ${count} slots` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
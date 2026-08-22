const express = require('express');
const router = express.Router();
const pool = require('../db');
const redis = require('../redis');
const sendEmail = require('../utils/email');
const { requireAuth, requireRole } = require('../middleware/auth');
const { getPreVisitSummary } = require('../utils/llm');

router.get('/doctors', requireAuth, async (req, res) => {
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

router.get('/doctors/:id/slots', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM slots WHERE doctor_id=$1 AND status='open' ORDER BY start_time ASC`,
      [req.params.id]
    );
    res.json({ success: true, slots: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/slots/:id/hold', requireAuth, requireRole('patient'), async (req, res) => {
  try {
    const key = `hold:slot:${req.params.id}`;
    const result = await redis.set(key, req.user.id, 'NX', 'EX', 300);
    if (result === null) {
      return res.status(409).json({ error: 'Slot is currently held by someone else' });
    }
    res.json({ success: true, message: 'Slot held for 5 minutes' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/slots/:id/confirm', requireAuth, requireRole('patient'), async (req, res) => {
  const client = await pool.connect();
  try {
    const slotId = req.params.id;
    const { symptoms } = req.body;

    await client.query('BEGIN');
    const slotRes = await client.query(
      'SELECT * FROM slots WHERE id=$1 AND status=$2 FOR UPDATE',
      [slotId, 'open']
    );
    if (slotRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Slot no longer available' });
    }

    await client.query('UPDATE slots SET status=$1 WHERE id=$2', ['booked', slotId]);
    const apptRes = await client.query(
      `INSERT INTO appointments(slot_id, patient_id, symptom_form, status)
       VALUES ($1,$2,$3,'confirmed') RETURNING *`,
      [slotId, req.user.id, symptoms || null]
    );
    await client.query('COMMIT');

    await redis.del(`hold:slot:${slotId}`);

    let preVisitSummary = { status: 'failed' };
    try {
      preVisitSummary = await getPreVisitSummary(symptoms || '');
      await pool.query(
        'UPDATE appointments SET pre_visit_summary=$1 WHERE id=$2',
        [preVisitSummary, apptRes.rows[0].id]
      );
    } catch (llmErr) {
      console.error('LLM pre-visit summary failed:', llmErr.message);
      await pool.query(
        'UPDATE appointments SET pre_visit_summary=$1 WHERE id=$2',
        [{ status: 'failed', error: llmErr.message }, apptRes.rows[0].id]
      );
    }

    // Send booking confirmation email
    try {
      const patientRes = await pool.query('SELECT email, name FROM users WHERE id=$1', [req.user.id]);
      const patient = patientRes.rows[0];
      const emailResult = await sendEmail(
        patient.email,
        'Appointment Confirmed',
        `Hi ${patient.name}, your appointment has been confirmed. We'll see you soon!`
      );
      await pool.query(
        `INSERT INTO notifications_log(type, recipient, payload, status, retry_count)
         VALUES ($1,$2,$3,$4,$5)`,
        ['booking_confirmation', patient.email, JSON.stringify({ appointment_id: apptRes.rows[0].id }), emailResult.success ? 'sent' : 'failed', emailResult.success ? 0 : 1]
      );
    } catch (emailErr) {
      console.error('Booking confirmation email failed:', emailErr.message);
    }

    res.json({ success: true, appointment: { ...apptRes.rows[0], pre_visit_summary: preVisitSummary } });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Slot already booked' });
    }
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
const pool = require('../db');

// Maps JS getDay() (0=Sun) to your working_hours keys
const dayMap = ['sun','mon','tue','wed','thu','fri','sat'];

async function generateSlotsForDoctor(doctorId, daysAhead = 30) {
  const doctorRes = await pool.query('SELECT * FROM doctors WHERE id=$1', [doctorId]);
  if (doctorRes.rows.length === 0) throw new Error('Doctor not found');
  const doctor = doctorRes.rows[0];
  const workingHours = doctor.working_hours;
  const slotDuration = doctor.slot_duration_min;

  const leavesRes = await pool.query('SELECT leave_date FROM doctor_leaves WHERE doctor_id=$1', [doctorId]);
  const leaveDates = new Set(leavesRes.rows.map(r => r.leave_date.toISOString().split('T')[0]));

  const today = new Date();
  const slotsToInsert = [];

  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const dayKey = dayMap[date.getDay()];

    if (leaveDates.has(dateStr)) continue; // skip leave days
    const hours = workingHours[dayKey];
    if (!hours) continue; // doctor doesn't work this day

    const [startStr, endStr] = hours;
    let current = new Date(`${dateStr}T${startStr}:00`);
    const end = new Date(`${dateStr}T${endStr}:00`);

    while (current < end) {
      const slotEnd = new Date(current.getTime() + slotDuration * 60000);
      if (slotEnd > end) break;
      slotsToInsert.push([doctorId, current.toISOString(), slotEnd.toISOString()]);
      current = slotEnd;
    }
  }

  // Insert slots, skipping ones that already exist (avoid duplicates on re-run)
  for (const [docId, start, endT] of slotsToInsert) {
    await pool.query(
      `INSERT INTO slots(doctor_id, start_time, end_time, status)
       SELECT $1,$2,$3,'open'
       WHERE NOT EXISTS (
         SELECT 1 FROM slots WHERE doctor_id=$1 AND start_time=$2
       )`,
      [docId, start, endT]
    );
  }

  return slotsToInsert.length;
}

module.exports = generateSlotsForDoctor;
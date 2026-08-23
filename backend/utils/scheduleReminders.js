function parseFrequency(prescriptionText) {
  const timesPerDayMatch = prescriptionText.match(/(once|twice|three times)/i);
  const daysMatch = prescriptionText.match(/(\d+)\s*day/i);

  const timesPerDay = { once: 1, twice: 2, 'three times': 3 }[timesPerDayMatch?.[1]?.toLowerCase()] || 1;
  const days = parseInt(daysMatch?.[1]) || 5;

  const intervalHours = 24 / timesPerDay;
  const totalReminders = timesPerDay * days;

  return { intervalHours, totalReminders };
}

async function scheduleReminders(db, { appointmentId, patientId, prescriptionText, startTime }) {
  if (!prescriptionText) return;

  const { intervalHours, totalReminders } = parseFrequency(prescriptionText);
  const rows = [];

  for (let i = 0; i < totalReminders; i++) {
    const scheduledAt = new Date(startTime.getTime() + i * intervalHours * 60 * 60 * 1000);
    rows.push([appointmentId, patientId, prescriptionText, scheduledAt]);
  }

  const values = rows.map((_, i) =>
    `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`
  ).join(',');
  const flatParams = rows.flat();

  await db.query(
    `INSERT INTO medication_reminders (appointment_id, patient_id, medication_name, scheduled_at) VALUES ${values}`,
    flatParams
  );
}

module.exports = { scheduleReminders, parseFrequency };
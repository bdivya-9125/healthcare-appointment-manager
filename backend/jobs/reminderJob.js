const cron = require('node-cron');
const sendEmail = require('../utils/email');

function startReminderJob(db) {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const { rows: dueReminders } = await db.query(
        `SELECT r.*, u.email, u.name
         FROM medication_reminders r
         JOIN users u ON u.id = r.patient_id
         WHERE r.status = 'pending' AND r.scheduled_at <= NOW()
         LIMIT 50`
      );

      for (const reminder of dueReminders) {
        try {
          await sendEmail(
            reminder.email,
            'Medication Reminder',
            `Hi ${reminder.name}, it's time to take your medication: ${reminder.medication_name}.`
          );

          await db.query(
            `UPDATE medication_reminders SET status = 'sent', attempts = attempts + 1, last_attempt_at = NOW() WHERE id = $1`,
            [reminder.id]
          );
        } catch (err) {
          console.error(`Reminder ${reminder.id} failed:`, err.message);
          await db.query(
            `UPDATE medication_reminders SET status = 'failed', attempts = attempts + 1, last_attempt_at = NOW() WHERE id = $1`,
            [reminder.id]
          );
        }
      }
    } catch (err) {
      console.error('Reminder job error:', err.message);
    }
  });

  cron.schedule('*/15 * * * *', async () => {
    const { rows: failedReminders } = await db.query(
      `SELECT r.*, u.email, u.name
       FROM medication_reminders r
       JOIN users u ON u.id = r.patient_id
       WHERE r.status = 'failed' AND r.attempts < 3`
    );

    for (const reminder of failedReminders) {
      try {
        await sendEmail(
          reminder.email,
          'Medication Reminder',
          `Hi ${reminder.name}, reminder: take your medication ${reminder.medication_name}.`
        );
        await db.query(
          `UPDATE medication_reminders SET status = 'sent', attempts = attempts + 1, last_attempt_at = NOW() WHERE id = $1`,
          [reminder.id]
        );
      } catch (err) {
        await db.query(
          `UPDATE medication_reminders SET attempts = attempts + 1, last_attempt_at = NOW() WHERE id = $1`,
          [reminder.id]
        );
      }
    }
  });

  console.log('Medication reminder job scheduled.');
}

module.exports = { startReminderJob };
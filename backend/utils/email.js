require('dotenv').config();

const { Resend } = require('resend');

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  console.error('RESEND_API_KEY is missing');
}

const resend = apiKey
  ? new Resend(apiKey)
  : null;


// =====================================================
// SEND EMAIL
// =====================================================

async function sendEmail(to, subject, text) {
  try {
    // Check Resend configuration
    if (!resend) {
      throw new Error(
        'RESEND_API_KEY is not configured'
      );
    }

    // Check recipient
    if (!to) {
      throw new Error(
        'Recipient email is missing'
      );
    }

    // Send email through Resend
    const { data, error } =
      await resend.emails.send({
        from:
          'Healthcare Appointment Manager <onboarding@resend.dev>',
        to: [to],
        subject,
        text
      });

    // Handle Resend API error
    if (error) {
      throw new Error(
        error.message ||
          'Resend email failed'
      );
    }

    console.log(
      `Email sent successfully to ${to}`
    );

    return {
      success: true,
      id: data?.id || null
    };

  } catch (err) {
    console.error(
      `Email send failed for ${to}:`,
      err?.message || err
    );

    return {
      success: false,
      error:
        err?.message ||
        'Email sending failed'
    };
  }
}


// =====================================================
// EXPORT
// =====================================================

module.exports = sendEmail;
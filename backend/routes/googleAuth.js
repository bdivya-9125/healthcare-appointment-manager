const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { getAuthUrl, getTokensFromCode } = require('../utils/googleCalendar');

router.get('/google', requireAuth, (req, res) => {
  const url = getAuthUrl(req.user.id);
  res.json({ authUrl: url });
});

router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const tokens = await getTokensFromCode(code);
    const userId = state;

    await pool.query('UPDATE users SET google_tokens=$1 WHERE id=$2', [JSON.stringify(tokens), userId]);

    res.send('<h2>Google Calendar connected! You can close this tab and return to the app.</h2>');
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
require('dotenv').config();

const { GoogleGenAI } = require('@google/genai');

const apiKey = process.env.LLM_API_KEY;

if (!apiKey) {
  throw new Error('LLM_API_KEY is missing');
}

console.log('Gemini API key loaded:', apiKey.substring(0, 6) + '...');

const ai = new GoogleGenAI({
  apiKey
});

async function callWithTimeout(prompt, retries = 1) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(
        `Gemini request attempt ${attempt + 1}/${retries + 1}`
      );

      const result = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt
        }),

        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Gemini request timed out')),
            15000
          )
        )
      ]);

      if (!result || !result.text) {
        throw new Error('Gemini returned an empty response');
      }

      console.log('Gemini request successful');

      return result.text;

    } catch (err) {
      lastError = err;

      console.error(
        'Gemini error:',
        err?.message || err
      );

      if (attempt < retries) {
        await new Promise(resolve =>
          setTimeout(resolve, 1000)
        );
      }
    }
  }

  throw lastError;
}


// ==========================================
// PRE-VISIT AI SUMMARY
// ==========================================

async function getPreVisitSummary(symptoms) {

  const prompt = `
You are an AI assistant helping a doctor prepare for a patient visit.

Analyze the following patient symptoms.

Return:

1. Urgency: Low, Medium, or High
2. Chief complaint
3. Exactly three useful questions the doctor should ask

Patient symptoms:
${symptoms}

Return ONLY valid JSON.

Example:

{
  "urgency": "Medium",
  "chief_complaint": "Fever and headache",
  "questions": [
    "When did the symptoms start?",
    "How severe are the symptoms?",
    "Are there any other associated symptoms?"
  ]
}
`;

  const text = await callWithTimeout(prompt);

  const cleaned = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  console.log(
    'Pre-visit Gemini response:',
    cleaned
  );

  try {
    const parsed = JSON.parse(cleaned);

    return {
      urgency: parsed.urgency || 'Medium',
      chief_complaint:
        parsed.chief_complaint || symptoms,
      questions:
        Array.isArray(parsed.questions)
          ? parsed.questions.slice(0, 3)
          : []
    };

  } catch (err) {

    console.error(
      'Failed to parse Gemini response:',
      cleaned
    );

    throw new Error(
      'Gemini returned invalid JSON'
    );
  }
}


// ==========================================
// POST-VISIT AI SUMMARY
// ==========================================

async function getPostVisitSummary(notes) {

  const prompt = `
Convert these doctor's clinical notes into a
simple patient-friendly summary.

Include:

- What was discussed
- Medication schedule
- Follow-up steps

Clinical notes:
${notes}

Keep the explanation clear and concise.
`;

  return await callWithTimeout(prompt);
}


module.exports = {
  getPreVisitSummary,
  getPostVisitSummary
};
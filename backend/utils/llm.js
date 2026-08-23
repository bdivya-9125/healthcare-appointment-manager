require('dotenv').config();

const { GoogleGenAI } = require('@google/genai');

if (!process.env.LLM_API_KEY) {
  throw new Error('LLM_API_KEY is missing from backend/.env');
}

const ai = new GoogleGenAI({
  apiKey: process.env.LLM_API_KEY
});

async function callWithTimeout(prompt, retries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`LLM request attempt ${attempt + 1}/${retries + 1}`);

      const result = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt
        }),

        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('LLM timeout after 10 seconds')),
            10000
          )
        )
      ]);

      if (!result || !result.text) {
        throw new Error('Gemini returned an empty response');
      }

      console.log('LLM request successful');

      return result.text;
    } catch (err) {
      lastError = err;

      console.error(
        `LLM attempt ${attempt + 1} failed:`,
        err?.message || err
      );

      if (attempt < retries) {
        const delay = 1500 * (attempt + 1);

        console.log(`Retrying LLM in ${delay}ms...`);

        await new Promise(resolve =>
          setTimeout(resolve, delay)
        );
      }
    }
  }

  throw lastError;
}


async function getPreVisitSummary(symptoms) {
  const prompt = `
Analyse these patient symptoms and return:

1. urgency level: Low, Medium, or High
2. chief complaint
3. exactly three suggested questions for the doctor

Symptoms:
${symptoms}

Respond ONLY with valid JSON in this exact format:

{
  "urgency": "Low",
  "chief_complaint": "...",
  "questions": [
    "...",
    "...",
    "..."
  ]
}
`;

  const text = (
    await callWithTimeout(prompt)
  )
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  console.log('Pre-visit LLM response:', text);

  try {
    return JSON.parse(text);
  } catch (err) {
    console.error('Failed to parse LLM JSON:', text);

    throw new Error(
      'LLM returned invalid JSON for pre-visit summary'
    );
  }
}


async function getPostVisitSummary(notes) {
  const prompt = `
Convert these clinical notes into a patient-friendly summary.

Include:
- What was discussed
- Medication schedule
- Follow-up steps

Clinical notes:
${notes}
`;

  return await callWithTimeout(prompt);
}


module.exports = {
  getPreVisitSummary,
  getPostVisitSummary
};
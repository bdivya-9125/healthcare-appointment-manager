require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.LLM_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

async function callWithTimeout(prompt) {
  const result = await Promise.race([
    model.generateContent(prompt),
    new Promise((_, reject) => setTimeout(() => reject(new Error('LLM timeout')), 10000))
  ]);
  return result.response.text();
}

async function getPreVisitSummary(symptoms) {
  const prompt = `Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: ${symptoms}. Respond ONLY in valid JSON: {"urgency": "...", "chief_complaint": "...", "questions": ["...", "...", "..."]}`;
  const text = (await callWithTimeout(prompt)).replace(/```json|```/g, '').trim();
  return JSON.parse(text);
}

async function getPostVisitSummary(notes) {
  const prompt = `Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: ${notes}`;
  return await callWithTimeout(prompt);
}

module.exports = { getPreVisitSummary, getPostVisitSummary };
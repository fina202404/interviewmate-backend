const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config(); // Ensure dotenv is configured to read GEMINI_API_KEY

let genAI;
let model;

if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: 'models/gemini-1.5-flash' });
} else {
    console.warn("GEMINI_API_KEY not found. Question generation will be mocked.");
}

router.post('/', async (req, res) => {
  const { jobTitle } = req.body;

  if (!jobTitle) {
    return res.status(400).json({ success: false, message: 'Job title is required' });
  }

  if (!model) { // Fallback if Gemini is not configured
    console.log("Gemini model not initialized. Returning mock questions.");
    const mockQuestions = [
        `Mock question 1 for ${jobTitle}?`,
        `Mock question 2 for ${jobTitle}?`,
        `Mock question 3 for ${jobTitle}?`
    ];
    return res.status(200).json({ success: true, questions: mockQuestions });
  }

  const prompt = `
    Give 3 realistic and insightful interview questions for the job role: "${jobTitle}".
    Format the output ONLY as a JSON array of strings. For example: ["Question 1?", "Question 2?"]
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Attempt to clean and parse the JSON
    let cleaned = text.replace(/```json/i, '').replace(/```/, '').trim();
    // Sometimes Gemini might still wrap with markdown or have leading/trailing text
    const jsonStart = cleaned.indexOf('[');
    const jsonEnd = cleaned.lastIndexOf(']');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }
    
    const questions = JSON.parse(cleaned);
    res.status(200).json({ success: true, questions });

  } catch (error) {
    console.error('Gemini error processing questions:', error.message || error);
    // Provide a fallback or a more specific error message
    const fallbackMessage = 'Failed to generate questions from AI. Please try again or contact support.';
    res.status(500).json({ success: false, message: fallbackMessage, details: error.message });
  }
});

module.exports = router;
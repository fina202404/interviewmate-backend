const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'models/gemini-1.5-flash' });

router.post('/', async (req, res) => {
  const { jobTitle } = req.body;

  if (!jobTitle) {
    return res.status(400).json({ message: 'Job title is required' });
  }

  const prompt = `
    Give 3 realistic and insightful interview questions for the job role: "${jobTitle}".
    Format the output as a JSON array of strings.
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const cleaned = text.replace(/```json/i, '').replace(/```/, '').trim();
    const questions = JSON.parse(cleaned);

    res.status(200).json({ questions });
  } catch (error) {
    console.error('Gemini error:', error.message || error);
    res.status(500).json({ message: 'Failed to generate questions' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { analyzeResponse } = require('../services/aiService');


router.post('/', async (req, res) => {
  const { question, answer } = req.body;

  if (!question || !answer) {
    return res.status(400).json({ message: 'Question and answer are required.' });
  }

  try {
    const result = await analyzeResponse(question, answer);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error analyzing response:', error.message || error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;

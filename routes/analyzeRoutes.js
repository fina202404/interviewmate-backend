const express = require('express');
const router = express.Router();
const { analyzeResponse } = require('../services/aiService'); // Ensure this path is correct

router.post('/', async (req, res) => { // This will handle POST /api/analyze/
  const { question, answer } = req.body;

  if (!question || !answer) {
    return res.status(400).json({ success: false, message: 'Question and answer are required.' });
  }

  try {
    const result = await analyzeResponse(question, answer);
    // The frontend InterviewPage.js expects the direct feedback object, not wrapped in { success: true }
    res.status(200).json(result);
  } catch (error) {
    console.error('Error analyzing response in route:', error.message || error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error during analysis.' });
  }
});

module.exports = router;
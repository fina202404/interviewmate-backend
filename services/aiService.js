const { GoogleGenerativeAI } = require('@google/generative-ai');
const analysisCache = new Map();
const CACHE_LIMIT = 50;

// Load Gemini API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'models/gemini-1.5-flash' });

async function analyzeResponse(question, answer) {
  try {
    const cacheKey = `${question}-${answer}`.substring(0, 100);
    if (analysisCache.has(cacheKey)) return analysisCache.get(cacheKey);

    const prompt = `
      Analyze this interview response and provide:
      1. Clarity score (1-10)
      2. Relevance score (1-10)
      3. Two improvement suggestions

      Question: "${question}"
      Answer: "${answer}"

      Format response as JSON with keys: clarity, relevance, suggestions
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // ✅ Remove markdown-style formatting if present
    const cleaned = text
      .replace(/```json/i, '')
      .replace(/```/, '')
      .trim();

    const analysis = JSON.parse(cleaned);

    if (analysisCache.size >= CACHE_LIMIT) analysisCache.clear();
    analysisCache.set(cacheKey, analysis);

    return analysis;
  } catch (error) {
    console.error('Gemini API error:', error.message || error);
    return {
      clarity: 0,
      relevance: 0,
      suggestions: ['Could not analyze the response. Please try again.']
    };
  }
}

module.exports = { analyzeResponse };

// =============================================
//  THALAMUS — api/ask.js
//  Vercel serverless function (fixed version)
//  Your Gemini API key stays here — safe.
// =============================================

const SYSTEM_PROMPT = `You are Thalamus, a friendly medical literacy assistant.
Your job is to help ordinary people understand health topics in simple, clear language —
explain things like you're talking to a curious 13-year-old.

ALWAYS respond with valid JSON only. No markdown, no backticks, no extra text before or after.

Use exactly this format:
{
  "simpleExplanation": "2-3 paragraphs explaining the concept simply",
  "keyTakeaways": ["point 1", "point 2", "point 3", "point 4"],
  "whenToSeeDoctor": "1-2 sentences on when to seek medical attention",
  "doctorQuestions": ["question 1", "question 2", "question 3", "question 4"]
}

Rules:
- Use everyday language. If you must use a medical term, explain it right away.
- Be warm and reassuring, not clinical or scary.
- keyTakeaways: exactly 4 short bullet points
- doctorQuestions: exactly 4 smart questions the person can ask their doctor
- Never diagnose anyone. Always remind them to consult a real doctor.`;

// ✅ FIX 1: Use module.exports instead of export default
module.exports = async function handler(req, res) {

  // Allow CORS (needed for browser to talk to backend)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ✅ FIX 2: Safely parse body (handles both string and object)
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const question = body && body.question;

  if (!question || question.trim().length < 3) {
    return res.status(400).json({ error: 'Question is too short' });
  }

  // API key from Vercel environment variables
  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

  try {
    const geminiResponse = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: SYSTEM_PROMPT + '\n\nUser question: ' + question
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000
        }
      })
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error('Gemini error:', errText);
      throw new Error('Gemini API error: ' + geminiResponse.status);
    }

    const data = await geminiResponse.json();
    const rawText = data.candidates[0].content.parts[0].text;
    const cleanText = rawText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanText);

    return res.status(200).json(parsed);

  } catch (err) {
    console.error('Thalamus backend error:', err.message);
    return res.status(500).json({ error: 'Something went wrong: ' + err.message });
  }
};

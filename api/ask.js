// =============================================
//  THALAMUS — api/ask.js
//  This is your Vercel serverless function.
//  It runs on Vercel's servers, not the browser.
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


export default async function handler(req, res) {

  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get the question from the request body
  const { question } = req.body;

  if (!question || question.trim().length < 3) {
    return res.status(400).json({ error: "Question is too short" });
  }

  // API key is read from Vercel environment variables (never exposed to browser)
  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: "API key not configured" });
  }

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

  try {
    // Call Gemini from the server
    const geminiResponse = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: SYSTEM_PROMPT + "\n\nUser question: " + question
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
      throw new Error("Gemini API error: " + geminiResponse.status);
    }

    const data = await geminiResponse.json();
    const rawText = data.candidates[0].content.parts[0].text;
    const cleanText = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanText);

    // Send the parsed result back to the browser
    return res.status(200).json(parsed);

  } catch (err) {
    console.error("Thalamus backend error:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}

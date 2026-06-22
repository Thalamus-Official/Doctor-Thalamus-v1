// =============================================
//  THALAMUS — script.js (Gemini version)
//  All the logic: API calls, UI updates,
//  input handling, error handling.
// =============================================

// ⚠️  PUT YOUR GEMINI API KEY HERE
//  Get one free at: https://aistudio.google.com
const API_KEY = "YOUR_GEMINI_API_KEY_HERE";

// Gemini model to use (free tier supports this)
const MODEL = "gemini-1.5-flash";

// Gemini API endpoint (key goes in the URL for Gemini)
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

// The prompt tells Gemini how to behave as Thalamus
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


// =============================================
//  UTILITY: Show / Hide elements
// =============================================
function show(id) {
  document.getElementById(id).style.display = 'block';
}

function hide(id) {
  document.getElementById(id).style.display = 'none';
}


// =============================================
//  Set a sample question into the text box
//  Called when user clicks a chip
// =============================================
function setQuestion(text) {
  const input = document.getElementById('questionInput');
  input.value = text;
  updateCount();
  input.focus();
}


// =============================================
//  Update the character counter below the box
//  Also enable/disable the Ask button
// =============================================
function updateCount() {
  const input = document.getElementById('questionInput');
  const count = input.value.length;

  document.getElementById('charCount').textContent = count + ' / 500';

  // Only enable the button if at least 3 chars typed
  document.getElementById('askBtn').disabled = count < 3;
}


// =============================================
//  MAIN FUNCTION: Ask Thalamus
//  Called when user clicks the Ask button
// =============================================
async function askThalamus() {
  const question = document.getElementById('questionInput').value.trim();

  // Safety check
  if (!question) return;

  // Reset UI state
  hide('resultArea');
  hide('errorCard');
  show('loadingState');
  document.getElementById('askBtn').disabled = true;

  try {
    // --- Make API call to Gemini ---
    // Gemini combines system prompt + user question into one "contents" array
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                // We combine the system prompt + the actual question into one message
                // because Gemini's free API doesn't support a separate system role
                text: SYSTEM_PROMPT + "\n\nUser question: " + question
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,      // Controls creativity (0 = robotic, 1 = creative)
          maxOutputTokens: 1000  // Max length of response
        }
      })
    });

    // Check if the HTTP request itself failed
    if (!response.ok) {
      throw new Error("API request failed with status " + response.status);
    }

    // Parse the response
    const data = await response.json();

    // Extract the text from Gemini's response
    // Gemini nests it inside: candidates[0].content.parts[0].text
    const rawText = data.candidates[0].content.parts[0].text;

    // Remove any accidental markdown code fences just in case
    const cleanText = rawText.replace(/```json|```/g, "").trim();

    // Parse the JSON that Gemini returned
    const parsed = JSON.parse(cleanText);

    // --- Populate the results UI ---
    populateResults(question, parsed);

    // Show results, hide loader
    hide('loadingState');
    show('resultArea');

  } catch (err) {
    // Something went wrong — show error message
    console.error("Thalamus error:", err);
    hide('loadingState');

    document.getElementById('errorMsg').textContent =
      "Couldn't get a response. Check your API key and internet connection.";

    // Show error card
    const errorCard = document.getElementById('errorCard');
    errorCard.style.display = 'flex';
  }

  // Re-enable the button
  document.getElementById('askBtn').disabled = false;
}


// =============================================
//  Populate all result sections with AI data
// =============================================
function populateResults(question, data) {

  // 1. Show the question back to the user
  document.getElementById('displayedQuestion').textContent = question;

  // 2. Simple explanation (allow line breaks)
  document.getElementById('simpleExplanation').innerHTML =
    data.simpleExplanation.replace(/\n/g, '<br>');

  // 3. When to see a doctor
  document.getElementById('whenDoctor').textContent = data.whenToSeeDoctor;

  // 4. Key takeaways — build list items dynamically
  const takeawaysList = document.getElementById('keyTakeaways');
  takeawaysList.innerHTML = '';
  (data.keyTakeaways || []).forEach(function(point) {
    const li = document.createElement('li');
    li.textContent = point;
    takeawaysList.appendChild(li);
  });

  // 5. Doctor questions — build list items dynamically
  const doctorList = document.getElementById('doctorQuestions');
  doctorList.innerHTML = '';
  (data.doctorQuestions || []).forEach(function(q) {
    const li = document.createElement('li');
    li.innerHTML = '<i class="ti ti-arrow-right"></i>' + q;
    doctorList.appendChild(li);
  });
}


// =============================================
//  Allow Ctrl+Enter to submit the question
// =============================================
document.getElementById('questionInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && e.ctrlKey) {
    askThalamus();
  }
});

// =============================================
//  THALAMUS — script.js (secure backend version)
//  No API key here anymore!
//  All calls go to your Vercel backend.
// =============================================

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
  document.getElementById('askBtn').disabled = count < 3;
}


// =============================================
//  MAIN FUNCTION: Ask Thalamus
//  Called when user clicks the Ask button
// =============================================
async function askThalamus() {
  const question = document.getElementById('questionInput').value.trim();

  if (!question) return;

  hide('resultArea');
  hide('errorCard');
  show('loadingState');
  document.getElementById('askBtn').disabled = true;

  try {
    // Call YOUR Vercel backend — not Gemini directly
    // /api/ask is the serverless function in api/ask.js
    const response = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: question })
    });

    if (!response.ok) {
      throw new Error("Backend error: " + response.status);
    }

    // Backend already parsed the JSON for us
    const parsed = await response.json();

    populateResults(question, parsed);
    hide('loadingState');
    show('resultArea');

  } catch (err) {
    console.error("Thalamus error:", err);
    hide('loadingState');

    document.getElementById('errorMsg').textContent =
      "Couldn't get a response. Please try again.";

    document.getElementById('errorCard').style.display = 'flex';
  }

  document.getElementById('askBtn').disabled = false;
}


// =============================================
//  Populate all result sections with AI data
// =============================================
function populateResults(question, data) {

  document.getElementById('displayedQuestion').textContent = question;

  document.getElementById('simpleExplanation').innerHTML =
    data.simpleExplanation.replace(/\n/g, '<br>');

  document.getElementById('whenDoctor').textContent = data.whenToSeeDoctor;

  const takeawaysList = document.getElementById('keyTakeaways');
  takeawaysList.innerHTML = '';
  (data.keyTakeaways || []).forEach(function(point) {
    const li = document.createElement('li');
    li.textContent = point;
    takeawaysList.appendChild(li);
  });

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

document.getElementById('homework-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const question = document.getElementById('question-input').value;
  const responseDiv = document.getElementById('ai-response');
  if (question) {
    responseDiv.textContent = "Thinking...";
    try {
      const res = await fetch('http://localhost:3000/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      const data = await res.json();
      responseDiv.textContent = data.answer || "Sorry, I couldn't get an answer.";
    } catch {
      responseDiv.textContent = "Error connecting to AI service.";
    }
  } else {
    responseDiv.textContent = "Please enter a question or upload a photo.";
  }
});
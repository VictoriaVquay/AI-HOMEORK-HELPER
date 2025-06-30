const form = document.getElementById('homework-form');
const questionInput = document.getElementById('question-input');
const photoInput = document.getElementById('photo-input');
const responseDiv = document.getElementById('ai-response');
const paymentStatus = document.getElementById('payment-status');

// === Form submit handler ===
form.addEventListener('submit', async function(e) {
  e.preventDefault();

  const question = questionInput.value.trim();
  const photo = photoInput.files[0];

  if (!question && !photo) {
    responseDiv.textContent = "Please enter a question or upload a photo.";
    return;
  }

  responseDiv.textContent = "Thinking...";

  const formData = new FormData();
  formData.append('question', question);
  if (photo) formData.append('photo', photo);

  try {
    const res = await fetch('http://localhost:3000/ask', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (res.ok) {
      responseDiv.textContent = data.answer || "No answer returned.";
    } else {
      responseDiv.textContent = data.error || "Error from AI service.";
    }
  } catch (err) {
    console.error(err);
    responseDiv.textContent = "Error connecting to AI service.";
  }
});

// === Helper: unlocks form after payment ===
function unlockForm() {
  form.style.pointerEvents = 'auto';
  form.style.opacity = '1';
  paymentStatus.textContent = "✅ Payment successful! You can now ask your question.";
}

// === Payment handlers ===
document.getElementById('pay-mpesa').onclick = async function() {
  const phone = prompt("Enter your M-Pesa phone number (format: 2547XXXXXXXX):");
  if (!phone) return;

  paymentStatus.textContent = "Processing M-Pesa payment...";

  try {
    const res = await fetch('http://localhost:3000/pay-mpesa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, amount: 10 })
    });
    const data = await res.json();

    if (res.ok && data.ResponseCode === "0") {
      paymentStatus.textContent = "📲 Payment request sent! Complete it on your phone...";
      // Here you could poll your backend to confirm payment. For demo: unlock after 5 sec
      setTimeout(unlockForm, 5000);
    } else {
      paymentStatus.textContent = data.error || "Payment initiation failed. Try again.";
    }
  } catch (err) {
    console.error(err);
    paymentStatus.textContent = "Error connecting to payment service.";
  }
};

document.getElementById('pay-paypal').onclick = function() {
  paymentStatus.textContent = "Processing PayPal payment...";
  setTimeout(unlockForm, 2000); // simulate quick success
};

document.getElementById('pay-airtel').onclick = function() {
  paymentStatus.textContent = "Processing Airtel Money payment...";
  setTimeout(unlockForm, 2000); // simulate quick success
};
